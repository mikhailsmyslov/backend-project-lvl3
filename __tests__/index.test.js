import nock from 'nock';
import os from 'os';
import path from 'path';
import fs from 'fs';
import cheerio from 'cheerio';
import pageLoader from '../src';

nock.disableNetConnect();

const baseUrl = 'https://google.com';
const repliesPath = `${__dirname}/__fixtures__/replies`;
const referenceHtml = fs.readFileSync(`${__dirname}/__fixtures__/expected/google-com.html`, 'utf-8');
const expectedHtml = cheerio.load(referenceHtml).html();

nock(baseUrl)
  .get('/')
  .replyWithFile(200, `${repliesPath}/google.html`);
nock(baseUrl)
  .get('/images/branding/googlelogo/2x/googlelogo_color_272x92dp.png')
  .replyWithFile(200, `${repliesPath}/googlelogo_color_272x92dp.png`);
nock(baseUrl)
  .get('/tia/tia.png')
  .replyWithFile(200, `${repliesPath}/tia.png`);

let tmpDirPath = '';

beforeEach(async () => {
  tmpDirPath = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'pageloadertest-'));
});

test('should work', async () => {
  await pageLoader(baseUrl, tmpDirPath);
  const html = await fs.promises.readFile(`${tmpDirPath}/google-com.html`, 'utf-8');
  expect(html).toBe(expectedHtml);
});
