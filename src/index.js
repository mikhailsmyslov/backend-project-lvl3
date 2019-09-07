import axios from 'axios';
import { promises as fs } from 'fs';
import debug from 'debug';
import url from 'url';
import path from 'path';
import cheerio from 'cheerio';
import Listr from 'listr';
import utils from './utils';

const tagsAttributes = { img: 'src', link: 'href', script: 'src' };
const getLink = ({ name, attribs }) => attribs[tagsAttributes[name]];

const log = debug('page-loader');

export default (pageUrl, outputPath) => {
  const filesDirName = utils.getDirName(pageUrl);
  const pageName = utils.getPageName(pageUrl);

  let $;
  const localResourses = [];

  log(`Getting data from ${pageUrl}`);
  return axios.get(pageUrl)
    .then(({ data }) => {
      $ = cheerio.load(data);
      log('Filtering DOM: Finding local resources');
      return $('*').filter((_i, node) => {
        const link = getLink(node);
        return !!link && utils.isLocalResource(link);
      });
    })
    .then((dom) => {
      const { protocol, host } = url.parse(pageUrl);
      dom.each((_i, node) => {
        const resUrl = url.format({ protocol, host, pathname: getLink(node) });
        const { name, ext } = path.parse(resUrl);
        const localPath = path.format({
          dir: filesDirName,
          base: name.replace(/\W/g, '-').concat(ext),
        });

        log(`Replacing link "${getLink(node)}" with "${localPath}"`);
        const attrName = tagsAttributes[node.name];
        $(node).attr(attrName, localPath);

        localResourses.push({ resUrl, localPath });
      });
    })
    .then(() => {
      log('Downloading rendered page');
      return fs.writeFile(path.join(outputPath, pageName), $.html());
    })
    .then(() => {
      log(`Creating directory "${filesDirName} in ${outputPath}"`);
      return fs.mkdir(path.join(outputPath, filesDirName));
    })
    .then(() => {
      log('Downloading local resources');
      const tasks = localResourses.map(({ resUrl, localPath }) => ({
        title: resUrl,
        task: () => utils.downloadResource(resUrl, path.join(outputPath, localPath)),
      }));
      return new Listr(tasks, { concurrent: true, exitOnError: false }).run();
    });
};
