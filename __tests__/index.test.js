import nock from 'nock';
import os from 'os';
import path from 'path';
import { promises as fs } from 'fs';
import pageLoader from '../src';

const baseUrl = 'https://hexlet.io';
const pathToBody = `${__dirname}/__fixtures__/test1.html`;
let tmpDir = '';

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'foo-'));
});

test('should work', async () => {
  const responceBody = await fs.readFile(pathToBody, 'utf-8');
  nock(baseUrl)
    .get('/courses')
    .reply(200, responceBody);
  const promise = pageLoader(`${baseUrl}/courses`, tmpDir);
  await expect(promise).resolves.toBe('Done');
  const result = await fs.readFile(`${tmpDir}/hexlet-io-courses.html`, 'utf-8');
  expect(result).toEqual(responceBody);
});
