import axios from 'axios';
import { promises as fs, createWriteStream } from 'fs';
import debug from 'debug';
import url from 'url';
import path from 'path';
import cheerio from 'cheerio';
import Listr from 'listr';
import stream from 'stream';
import util from 'util';

const selectors = {
  IMG: 'src',
  LINK: 'href',
  SCRIPT: 'src',
};

const selection = Object.entries(selectors).map(([tag, attr]) => `${tag}[${attr}]`).join();

const pipeline = util.promisify(stream.pipeline);
const log = debug('page-loader');

export default (pageUrl, outputPath = process.cwd()) => {
  const { protocol, host, pathname } = url.parse(pageUrl);
  const namePart = path.join(host, pathname.substr(1)).replace(/\W/g, '-');

  const filesDirName = namePart.concat('_files');
  const pageName = namePart.concat('.html');

  const tasks = [];
  let renderedHtml;

  log(`Getting data from ${pageUrl}`);
  return axios.get(pageUrl).then((responce) => {
    log('Parsing HTML');
    const $ = cheerio.load(responce.data);
    $(selection)
      .each((_i, el) => {
        const tagName = $(el).prop('tagName');
        const attrName = selectors[tagName];
        const link = $(el).attr(attrName);

        if (url.parse(link).host) return;

        const resourceUrl = url.format({ protocol, host, pathname: link });

        const { name, ext } = path.parse(resourceUrl);
        const relativeLocalPath = path.format({
          dir: filesDirName,
          name: name.replace(/\W/g, '-'),
          ext,
        });
        const absLocalPath = path.join(outputPath, relativeLocalPath);

        log(`Changing "${link}" to "${relativeLocalPath}"`);
        $(el).attr(attrName, relativeLocalPath);

        tasks.push({
          title: link,
          task: () => axios.get(resourceUrl, { responseType: 'stream' })
            .then(({ data }) => pipeline(data, createWriteStream(absLocalPath))),
        });
      });
    log('Rendering HTML');
    renderedHtml = $.html();
  })
    .then(() => {
      log(`Creating directory "${filesDirName} in ${outputPath}"`);
      return fs.mkdir(path.join(outputPath, filesDirName));
    })
    .then(() => {
      log(`Downloading "${pageUrl}" in ${outputPath}`);
      return fs.writeFile(path.join(outputPath, pageName), renderedHtml);
    })
    .then(() => {
      log('Downloading local resources');
      return new Listr(tasks, { concurrent: true, exitOnError: false }).run();
    });
};
