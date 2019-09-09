import path from 'path';
import _ from 'lodash';
import stream from 'stream';
import util from 'util';
import axios from 'axios';
import fs from 'fs';

const pipeline = util.promisify(stream.pipeline);

const buildName = (pageUrl) => {
  const { host, pathname } = new URL(pageUrl);
  return path.join(host, _.trimStart(pathname, '/')).replace(/\W/g, '-');
};

export const buildPageFileName = (pageUrl) => buildName(pageUrl).concat('.html');

export const buildFilesDirName = (pageUrl) => buildName(pageUrl).concat('_files');

export const isLocalResource = (link) => !(/^[\w+.]*:|\/\//).test(link);

export const downloadFile = (fromUrl, toLocalPath) => axios
  .get(fromUrl, { responseType: 'stream' })
  .then(({ data }) => pipeline(data, fs.createWriteStream(toLocalPath)));

export const buildFileNameFromLink = (link) => {
  const { name, ext } = path.parse(link);
  return `${name.replace(/\W/g, '-')}${ext}`;
};
