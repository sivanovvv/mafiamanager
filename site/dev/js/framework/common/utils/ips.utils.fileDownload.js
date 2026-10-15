/**
 * ips.utils.fileDownload.js
 *
 * Module to handle downloading of files from a URL by JS. Uses native es promises
 *
 *
 * @author Matt Finger
 */
;(function($, _) {
    "use strict";

    ips.createModule('ips.utils.fileDownload', function() {
        class DownloadError extends RangeError {
            /**@type{Error}*/
            sourceErr = undefined

            /**@type{XMLHttpRequest}*/
            xhr = undefined

            constructor(message, xhr) {
                super(message);
                this.sourceErr = this;
                this.xhr = xhr;
            }

            static fromError(err, xhr) {
                const downloadError = new DownloadError(`Failed to download - ${err.message}`, xhr);
                downloadError.sourceErr = err;
                return downloadError;
            }
        }
        return {
            /**
             * Use an XHR request to download a blob of data
             *
             * @param {string}  url                     The url from which to download the file
             * @param {string}  blobName                The default filename of the downloaded file
             * @param {boolean} [forceBlobName=false]   By default, if the xhr request receives a filename in the content disposition header, it will use that as the filename. When this is true, the provided blobName will be used no matter what.
             * @param {undefined|function(ProgressEvent):void} [onProgress]         An optional callback that is invoked as chunks are downloaded
             * @param {FormData|undefined}    [formData]        Form data to include in the request. When this is not a FormData instance, the XHR request will be GET instead of POST
             * @param {boolean}                 [forceDownload=false]       If true, this will download a file containing the response even if there is no content-disposition header in the response
             *
             * @return {Promise<void>}
             */
            download({url, blobName, onProgress, formData, forceBlobName=false, forceDownload=false}) {
                return new Promise((resolve, _reject) => {
                    const xhr = new XMLHttpRequest();
                    let blob;
                    xhr.open(formData ? 'POST' : 'GET', url, true);

                    const reject = e => {
                        _reject(DownloadError.fromError(e, xhr));
                    }

                    xhr.responseType = "arraybuffer";
                    xhr.onload = function(e) {
                        blob = new Blob([this.response]);
                    };

                    xhr.onprogress = function(e) {
                        onProgress?.call(this, e);
                    };

                    xhr.onerror = function(e) {
                        reject(e);
                    }

                    xhr.onloadend = function(e) {
                        try {
                            // downloadable type?
                            if (xhr.responseType !== 'arraybuffer' && xhr.responseType !== 'blob' && xhr.responseType !== 'text') {
                                throw new RangeError(`Cannot download data from response of type ${xhr.responseType}`);
                            }

                            // is this a 2xx response?
                            if (!xhr.status?.toString().match(/^2\d\d$/)) {
                                throw new RangeError(`Response did not receive a 2xx response status. Got status code ${xhr.status}`);
                            }

                            const tempLink = document.createElement('a');
                            let href = window.URL.createObjectURL(blob);
                            tempLink.href = href;
                            tempLink.setAttribute('hidden', '');

                            let contentDispositionName = this.getResponseHeader('content-disposition')?.match(/filename="(.+)"/i)?.[1];
                            if (!contentDispositionName && !forceDownload) {
                                throw new RangeError(`There is no content-disposition name in the response`);
                            }
                            if (forceBlobName || !contentDispositionName) {
                                contentDispositionName = blobName;
                            } else {
                                contentDispositionName = decodeURIComponent(contentDispositionName);
                            }
                            tempLink.setAttribute('download', contentDispositionName);
                            document.body.appendChild(tempLink);
                            tempLink.click();
                            window.URL.revokeObjectURL(href);

                            setTimeout(() => {
                                tempLink.remove();
                                resolve();
                            });
                        } catch (e) {
                            reject(e);
                        }
                    };

                    xhr.setRequestHeader('X-REQUESTED-WITH', 'XMLHttpRequest');
                    if (formData) {
                        xhr.send(formData);
                    } else {
                        xhr.send();
                    }
                });
            }
        };
    });
}(jQuery));