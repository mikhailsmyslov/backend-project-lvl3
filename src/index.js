import axios from 'axios';
import { promises as fs, createWriteStream } from 'fs';

import url from 'url';
import path from 'path';
import cheerio from 'cheerio';

const getPageName = (pageUrl) => {
  const { hostname, pathname } = url.parse(pageUrl);
  const urlPath = pathname === '/' ? '' : pathname;
  return `${hostname}${urlPath}`.replace(/\W/g, '-');
};

const requests = {
  IMG: (elemUrl, localPath) => axios.get(elemUrl, { responseType: 'stream' })
    .then(({ data }) => data.pipe(createWriteStream(localPath))),
  SCRIPT: (elemUrl, localPath) => axios.get(elemUrl)
    .then(({ data }) => fs.writeFile(localPath, data)),
  LINK: (elemUrl, localPath) => axios.get(elemUrl)
    .then(({ data }) => fs.writeFile(localPath, data)),
};

export default (pageUrl, outputPath = process.cwd()) => {
  const filesDirName = getPageName(pageUrl).concat('_files');
  const pageName = getPageName(pageUrl).concat('.html');
  let promises = [];
  return axios.get(pageUrl)
    .then((responce) => {
      const body = responce.data;
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
          $(el).attr('src', `./${filesDirName}/${localPath.name}${localPath.ext}`);
          downloads.push({ tagName, localPath: path.format(localPath), elemUrl });
        });
      promises = downloads
        .map(({ tagName, localPath, elemUrl }) => requests[tagName](elemUrl, localPath));
      return $.html();
    })
    .then((html) => {
      fs.writeFile(path.join(outputPath, pageName), html);
      fs.mkdir(path.join(outputPath, filesDirName)).then(() => Promise.all(promises));
    });
};
