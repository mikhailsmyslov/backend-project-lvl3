import axios from 'axios';
import { promises as fs } from 'fs';
import debug from 'debug';
import path from 'path';
import cheerio from 'cheerio';
import Listr from 'listr';
import * as utils from './utils';

const tagsAttributes = { img: 'src', link: 'href', script: 'src' };
const jquerySelector = Object.entries(tagsAttributes).map(([tag, attr]) => `${tag}[${attr}]`).join();

const getLinkFromNode = ({ name: tagName, attribs }) => attribs[tagsAttributes[tagName]];
const getAttrNameFromNode = ({ name: tagName }) => tagsAttributes[tagName];

const log = debug('page-loader');

export default (pageUrl, outputPath) => {
  const filesDirName = utils.buildFilesDirName(pageUrl);
  const pageName = utils.buildPageFileName(pageUrl);
  const baseUrl = new URL(pageUrl).origin;

  const downloadsList = [];

  log(`Getting data from ${pageUrl}`);
  return axios.get(pageUrl)
    .then(({ data: html }) => {
      const dom = cheerio.load(html);

      dom(jquerySelector)
        .filter((_i, node) => {
          const link = getLinkFromNode(node);
          return utils.isLocalResource(link);
        })
        .each((_i, node) => {
          const link = getLinkFromNode(node);
          const fileName = utils.buildFileNameFromLink(link);
          const url = new URL(link, baseUrl).href;
          const relLocalPath = path.join(filesDirName, fileName);
          const absLocalPath = path.join(outputPath, relLocalPath);

          log(`Replacing link "${link}" with "${relLocalPath}"`);
          const attrName = getAttrNameFromNode(node);
          dom(node).attr(attrName, relLocalPath);

          downloadsList.push({ from: url, to: absLocalPath });
        });

      return dom.html();
    })
    .then((html) => {
      log('Downloading rendered page');
      return fs.writeFile(path.join(outputPath, pageName), html);
    })
    .then(() => {
      log(`Creating directory "${filesDirName} in ${outputPath}"`);
      return fs.mkdir(path.join(outputPath, filesDirName));
    })
    .then(() => {
      log('Downloading local resources');
      const tasks = downloadsList
        .map(({ from, to }) => ({ title: from, task: () => utils.downloadFile(from, to) }));
      return new Listr(tasks, { concurrent: true, exitOnError: false }).run();
    });
};
