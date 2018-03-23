"use strict";

const fs = require('fs');
const path = require('path');
const util = require('util');
const events = require('events');
const Ftp = require('jsftp');
const async = require('async');
const minimatch = require('minimatch');
const read = require('read');
const client = require('scp2')
// A utility function to remove lodash/underscore dependency
// Checks an obj for a specified key
function has(obj, key) {
	return Object.prototype.hasOwnProperty.call(obj, key);
}

const Deployer = function () {
	// The constructor for the super class.
	events.EventEmitter.call(this);

	const thisDeployer = this;

	let transferredFileCount = 0;
	let ftp;
	let localRoot;
	let remoteRoot;
	const partialDirectories = [];   // Holds list of directories to check & create (excluding local root path)
	const partialFilePaths = [];     // Holds list of partial file paths to upload
	// var parallelUploads = 1;      // NOTE: this can be added in when sftp is supported
	let exclude = [];
	let include = [];
	let continueOnError = false;

	function canIncludeFile(filePath) {
		let i;

		if (include.length > 0) {
			for (i = 0; i < include.length; i++) {
				if (minimatch(filePath, include[i], {matchBase: true})) {
					return true;
				}
			}
			// Fallthrough to exclude list
		}

		if (exclude.length > 0) {
			for (i = 0; i < exclude.length; i++) {
				if (minimatch(filePath, exclude[i], {matchBase: true})) {
					return false;
				}
			}
		}
		return true;
	}

	// A method for parsing the source location and storing the information into a suitably formated object
	function dirParseSync(startDir, result) {
		let i;
		let tmpPath;
		let currFile;

		// Initialize the `result` object if it is the first iteration
		if (result === undefined) {
			result = {};
			result[path.sep] = [];
		}

		// Check if `startDir` is a valid location
		if (!fs.existsSync(startDir)) {
			// console.error(startDir + 'is not an existing location');
			throw new Error(startDir + 'is not an existing location');
		}

		// Iterate throught the contents of the `startDir` location of the current iteration
		const files = fs.readdirSync(startDir);
		for (i = 0; i < files.length; i++) {
			currFile = path.join(startDir, files[i]);

			if (fs.lstatSync(currFile).isDirectory()) {
				tmpPath = path.relative(localRoot, currFile);

				// Check exclude rules
				if (canIncludeFile(tmpPath)) {
					if (!has(result, tmpPath)) {
						result[tmpPath] = [];
						partialDirectories.push(tmpPath);
					}
					dirParseSync(currFile, result);
				}
			} else {
				tmpPath = path.relative(localRoot, startDir);
				if (tmpPath.length === 0) {
					tmpPath = path.sep;
				}

				// Check exclude rules
				const partialFilePath = path.join(tmpPath, files[i]);
				if (canIncludeFile(partialFilePath)) {
					result[tmpPath].push(files[i]);
					partialFilePaths.push(partialFilePath);
				}
			}
		}

		return result;
	}
	function sftpPut(partialFilePath, cb){
		let remoteFilePath = path.join(remoteRoot, partialFilePath);
		const fullLocalPath = path.join(localRoot, partialFilePath);
		uploading(partialFilePath)
		console.log("uploading...",remoteFilePath)
		try {
			client.scp(fullLocalPath, thisDeployer.config.username + ':' + thisDeployer.config.password + '@' + thisDeployer.config.host + ':' + remoteFilePath, function (err) {
			  err && console.log(err)
			  err || cb()

			})
		  } catch (e) {
			console.log(e)
		  }
	}
	function uploading(partialFilePath){
		

		const emitData = {
			totalFileCount: partialFilePaths.length,
			transferredFileCount,
			percentComplete: Math.round((transferredFileCount / partialFilePaths.length) * 100),
			filename: partialFilePath
		};

		thisDeployer.emit('uploading', emitData);
		return emitData
	}
	// A method for uploading a single file
	function ftpPut(partialFilePath, cb) {
		let remoteFilePath = remoteRoot + '/' + partialFilePath;
		remoteFilePath = remoteFilePath.replace(/\\/g, '/');

		const fullLocalPath = path.join(localRoot, partialFilePath);
		let emitData = uploading(partialFilePath)
		ftp.put(fullLocalPath, remoteFilePath, err => {
			if (err) {
				emitData.err = err;
				thisDeployer.emit('error', emitData); // Error event from 0.5.x TODO: either expand error events or remove this
				thisDeployer.emit('upload-error', emitData);
				if (continueOnError) {
					cb();
				} else {
					cb(err);
				}
			} else {
				transferredFileCount++;
				emitData.transferredFileCount = transferredFileCount;
				thisDeployer.emit('uploaded', emitData);
				cb();
			}
		});
	}

	function ftpMakeDirectoriesIfNeeded(cb) {
		async.eachSeries(partialDirectories, ftpMakeRemoteDirectoryIfNeeded, err => {
			cb(err);
		});
	}

  // A method for changing the remote working directory and creating one if it doesn't already exist
	function ftpMakeRemoteDirectoryIfNeeded(partialRemoteDirectory, cb) {
    // Add the remote root, and clean up the slashes
		let fullRemoteDirectory = remoteRoot + '/' + partialRemoteDirectory.replace(/\\/gi, '/');

    // Add leading slash if it is missing
		if (fullRemoteDirectory.charAt(0) !== '/') {
			fullRemoteDirectory = '/' + fullRemoteDirectory;
		}

    // Remove double // if present
		fullRemoteDirectory = fullRemoteDirectory.replace(/\/\//g, '/');
		ftp.raw('cwd', fullRemoteDirectory, (err) => {
			if (err) {
				ftp.raw('mkd', fullRemoteDirectory, (err) => {
					if (err) {
						cb(err);
					} else {
						ftpMakeRemoteDirectoryIfNeeded(partialRemoteDirectory, cb);
					}
				});
			} else {
				cb();
			}
		});
	}

	this.deploy = function (config, cb) {
	// Prompt for password if none was given
		thisDeployer.config = config
		if (config.password) {
			configComplete(config, cb);
		} else {
			read({prompt: 'Password for ' + config.username + '@' + config.host + ' (ENTER for none): ', default: '', silent: true}, (err, res) => {
				if (err) {
					return cb(err);
				}
				config.password = res;
				configComplete(config, cb);
			});
		}
	};

	function configComplete(config, cback) {
	// Init
	config.protocol == "ftp"&&(ftp = new Ftp({
			host: config.host,
			port: config.port
		}))

		localRoot = config.localRoot;
		remoteRoot = config.remoteRoot;
		if (has(config, 'continueOnError')) {
			continueOnError = config.continueOnError;
		}
		exclude = config.exclude || exclude;
		include = config.include || include;

		config.protocol == "ftp"&&(ftp.useList = true);
		dirParseSync(localRoot);

    // Authentication and main processing of files
	config.protocol == "ftp" && ftp.auth(config.username, config.password, err => {
			if (err) {
				cback(err);
			} else {
				ftpMakeDirectoriesIfNeeded(err => {
					if (err) {
            // If there was an error creating a remote directory we can't continue to upload files
					cback(err);
					} else {
						async.eachSeries(partialFilePaths, ftpPut, err => {
							if (err) {
								cback(err);
							} else {
								ftp.raw('quit', (err, data) => {
									cback(err);
									console.log('success')
								});
							}
						});
					}
				});
			}
		});
		config.protocol == "sftp" && async.eachSeries(partialFilePaths, sftpPut, err => {
							if (err) {
								cback(err);
							}else{
								cback();
							}
							
		});
	}
};

util.inherits(Deployer, events.EventEmitter);

module.exports = Deployer;