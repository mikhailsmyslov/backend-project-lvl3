import url from 'url';
import path from 'path';
import _ from 'lodash';
import stream from 'stream';
import util from 'util';
import axios from 'axios';
import fs from 'fs';

export const isLocalResource = (link) => {
  const { host } = url.parse(link);
  return !host && !link.startsWith('//');
};

const getResourceName = (pageUrl) => {
  const { host, pathname } = url.parse(pageUrl);
  return path.join(host, _.trimStart(pathname, '/')).replace(/\W/g, '-');
};
export const getPageName = (pageUrl) => getResourceName(pageUrl).concat('.html');
export const getDirName = (pageUrl) => getResourceName(pageUrl).concat('_files');

const pipeline = util.promisify(stream.pipeline);
export const downloadResource = (fromUrl, toLocalPath) => axios.get(fromUrl, { responseType: 'stream' })
  .then(({ data }) => pipeline(data, fs.createWriteStream(toLocalPath)));
