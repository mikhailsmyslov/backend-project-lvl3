import nock from 'nock';
import os from 'os';
import path from 'path';
import { promises as fs } from 'fs';
import cheerio from 'cheerio';
import pageLoader from '../src';

nock.disableNetConnect();

const repliesPath = `${__dirname}/__fixtures__/replies`;
const expectedPath = `${__dirname}/__fixtures__/expected`;

let tmpDirPath = '';
const baseUrl = 'https://testpage.com';

beforeEach(async () => {
  nock(baseUrl)
    .get('/').replyWithFile(200, `${repliesPath}/testpage.html`)
    .get('/images/b,e[e]r.jpg')
    .replyWithFile(200, `${repliesPath}/images/b,e[e]r.jpg`)
    .get('/style.css')
    .replyWithFile(200, `${repliesPath}/style.css`)
    .get('/script')
    .replyWithFile(200, `${repliesPath}/script`)
    .get('/images/not-exist.png')
    .reply(404)
    .get('/notfound')
    .reply(404)
    .get('/not200')
    .reply(302, undefined, { Location: '/redirect' })
    .get('/redirect')
    .reply(204);
  tmpDirPath = await fs.mkdtemp(path.join(os.tmpdir(), 'pageloadertest-'));
});

test('HTTP error', async () => expect(pageLoader(`${baseUrl}/notfound`, tmpDirPath))
  .rejects.toThrowErrorMatchingSnapshot('404'));

test('FS error', async () => expect(pageLoader(baseUrl, '/notExist'))
  .rejects.toThrowErrorMatchingSnapshot('ENOENT'));

test('Should work', async () => {
  const reference = await fs.readFile(`${expectedPath}/testpage-com.html`, 'utf-8');
  const expected = cheerio.load(reference).html();

  await expect(pageLoader(baseUrl, tmpDirPath))
    .rejects.toThrowErrorMatchingSnapshot('Some resource is not downloaded');

  const actual = await fs.readFile(`${tmpDirPath}/testpage-com.html`, 'utf-8');
  expect(actual).toBe(expected);

  const actualFilesList = await fs.readdir(path.join(tmpDirPath, 'testpage-com_files'));
  expect(actualFilesList).toEqual(['b-e-e-r.jpg', 'script', 'style.css']);
});
