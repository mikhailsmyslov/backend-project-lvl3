import axios from 'axios';
import { promises as fs } from 'fs';
import url from 'url';
import path from 'path';

const getFileName = (pageUrl) => {
  const { hostname, pathname } = url.parse(pageUrl);
  return `${hostname}${pathname}`.replace(/[^a-zA-Z0-9]/g, '-').concat('.html');
};

const pageLoader = (pageUrl, outputPath = __dirname) => axios.get(pageUrl)
  .then((responce) => {
    const fileName = getFileName(pageUrl);
    fs.writeFile(path.join(outputPath, fileName), responce.data);
    return 'Done';
  });

export default pageLoader;
