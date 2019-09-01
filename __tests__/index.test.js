import nock from 'nock';
import os from 'os';
import path from 'path';
import fs from 'fs';
import cheerio from 'cheerio';
import pageLoader from '../src';

nock.disableNetConnect();

const repliesPath = `${__dirname}/__fixtures__/replies`;
const referenceHtml = fs.readFileSync(`${__dirname}/__fixtures__/expected/testpage-com.html`, 'utf-8');
const expectedHtml = cheerio.load(referenceHtml).html();

let tmpDirPath = '';
const baseUrl = 'https://testpage.com';

beforeEach(() => {
  nock(baseUrl)
    .get('/').replyWithFile(200, `${repliesPath}/testpage.html`)
    .get('/images/beer.jpg')
    .replyWithFile(200, `${repliesPath}/images/beer.jpg`)
    .get('/style.css')
    .replyWithFile(200, `${repliesPath}/style.css`)
    .get('/script')
    .replyWithFile(200, `${repliesPath}/script`)
    .get('/notfound')
    .reply(404)
    .get('/not200')
    .reply(302, undefined, { Location: '/redirect' })
    .get('/redirect')
    .reply(204);
  tmpDirPath = fs.mkdtempSync(path.join(os.tmpdir(), 'pageloadertest-'));
});

test('HTTP error 4xx', async () => expect(pageLoader(`${baseUrl}/notfound`, tmpDirPath))
  .rejects.toThrowErrorMatchingSnapshot());

test('HTTP code is not 200', async () => expect(pageLoader(`${baseUrl}/not200`, tmpDirPath))
  .rejects.toThrowErrorMatchingSnapshot());

test('FS error', async () => expect(pageLoader(baseUrl, '/notExist'))
  .rejects.toThrowErrorMatchingSnapshot());

test('Should work', async () => {
  await pageLoader(baseUrl, tmpDirPath);
  const html = await fs.promises.readFile(`${tmpDirPath}/testpage-com.html`, 'utf-8');
  await expect(html).toBe(expectedHtml);
});
