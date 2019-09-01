import axios from 'axios';
import { promises as fs, createWriteStream } from 'fs';
import debug from 'debug';
import url from 'url';
import path from 'path';
import cheerio from 'cheerio';

const selectors = { IMG: 'src', LINK: 'href', SCRIPT: 'src' };
const selection = Object.entries(selectors).map(([tag, attr]) => `${tag}[${attr}]`).join();

const log = debug('page-loader');

export default (pageUrl, outputPath = process.cwd()) => {
  const { protocol, host, pathname } = url.parse(pageUrl);
  const namePart = path.join(host, pathname.substr(1)).replace(/\W/g, '-');

  const filesDirName = namePart.concat('_files');
  const pageName = namePart.concat('.html');

  let html = '';

  log(`Getting data from ${pageUrl}`);
  return axios.get(pageUrl).then(({ status, data }) => {
    if (status !== 200) throw new Error(`Expected HTTP status code 200, but recieved ${status}`);
    html = data;
  })
    .then(() => {
      log(`Creating directory "${filesDirName}" in "${outputPath}"`);
      return fs.mkdir(path.join(outputPath, filesDirName));
    })
    .then(() => {
      log('Parsing the HTML');
      const $ = cheerio.load(html);
      $(selection)
        .each((_i, el) => {
          const tagName = $(el).prop('tagName');
          const attrName = selectors[tagName];
          const link = $(el).attr(attrName);

          if (url.parse(link).host) return;

          const resourceUrl = url.format({ protocol, host, pathname: link });
          const { name, ext } = path.parse(resourceUrl);
          const relativeLocalPath = path.format({ dir: filesDirName, name: name.replace(/\W/g, '-'), ext });
          const absLocalPath = path.join(outputPath, relativeLocalPath);

          log(`Changing link in HTML to ${relativeLocalPath}`);
          $(el).attr(attrName, relativeLocalPath);

          axios.get(resourceUrl, { responseType: 'stream' })
            .then(({ data }) => data.pipe(createWriteStream(absLocalPath)));
        });
      log('Rendering HTML');
      return $.html();
    })
    .then((renderedHtml) => {
      log(`Saving page as ${pageName} at ${outputPath}`);
      return fs.writeFile(path.join(outputPath, pageName), renderedHtml);
    });
};
