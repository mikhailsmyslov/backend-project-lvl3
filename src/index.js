import axios from 'axios';
import { promises as fs, createWriteStream } from 'fs';
import debug from 'debug';
import url from 'url';
import path from 'path';
import cheerio from 'cheerio';

const getPageName = (pageUrl) => {
  const { hostname, pathname } = url.parse(pageUrl);
  const urlPath = pathname === '/' ? '' : pathname;
  return `${hostname}${urlPath}`.replace(/\W/g, '-');
};

const requestElement = (elemUrl, localPath) => axios.get(elemUrl)
  .then(({ data }) => fs.writeFile(localPath, data));
const requests = {
  IMG: (elemUrl, localPath) => axios.get(elemUrl, { responseType: 'stream' })
    .then(({ data }) => data.pipe(createWriteStream(localPath))),
  SCRIPT: requestElement,
  LINK: requestElement,
};

const log = debug('page-loader');

export default (pageUrl, outputPath = process.cwd()) => {
  const filesDirName = getPageName(pageUrl).concat('_files');
  const pageName = getPageName(pageUrl).concat('.html');
  let promises = [];
  log(`Getting data from ${pageUrl}`);
  return axios.get(pageUrl)
    .then((responce) => {
      const body = responce.data;
      log('Parsing the HTML');
      const $ = cheerio.load(body);
      const downloads = [];
      $('[src]')
        .filter((_i, el) => {
          const { host } = url.parse($(el).attr('src'));
          return !host;
        })
        .each((_i, el) => {
          const { protocol, host } = url.parse(pageUrl);
          const elemUrl = url.format({
            protocol,
            host,
            pathname: $(el).attr('src'),
          });
          const tagName = $(el).prop('tagName');
          const pathObj = path.parse(elemUrl);
          const localPath = {
            dir: path.join(outputPath, filesDirName),
            name: pathObj.name.replace(/\W/g, '-'),
            ext: pathObj.ext,
          };
          const relativePath = `./${filesDirName}/${localPath.name}${localPath.ext}`;
          log(`Changing attribute value: from ${elemUrl} to ${relativePath}`);
          $(el).attr('src', relativePath);
          downloads.push({ tagName, localPath: path.format(localPath), elemUrl });
        });
      promises = downloads
        .map(({ tagName, localPath, elemUrl }) => {
          const request = requests[tagName];
          return request(elemUrl, localPath);
        });
      log('Rendering HTML');
      return $.html();
    })
    .then((html) => {
      const filePath = path.join(outputPath, pageName);
      const dirPath = path.join(outputPath, filesDirName);
      fs.writeFile(filePath, html)
        .then(() => log(`Page saved as ${filePath}`));
      fs.mkdir(dirPath)
        .then(() => {
          log(`Directory ${dirPath} created`);
          Promise.all(promises);
        })
        .then(() => log('Resolving promises: Done'));
    });
};
