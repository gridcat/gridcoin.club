/* eslint-disable import/no-extraneous-dependencies */
import {
  env,
  createExecutionContext,
  waitOnExecutionContext,
  fetchMock,
} from 'cloudflare:test';
import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
} from 'vitest';
import worker from '../src/index';

const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;
const maintenancePageURL = 'https://maintenance.gridcoin.club';
const mainPage = 'https://stamps.gridcoin.club';
const productionSnapshot = 'This is production';
const maintenanceSnapshot = 'This is maintenance';

describe('Maintenance page worker', () => {
  beforeAll(() => {
    fetchMock.activate();
    fetchMock.disableNetConnect();
  });
  afterAll(() => fetchMock.assertNoPendingInterceptors());

  it('should redirect to the maintenance page from stamp.gridcoin.club', async () => {
    const request = new IncomingRequest(mainPage);
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, env, ctx);
    await waitOnExecutionContext(ctx);
    expect(response.headers.get('location')).toBe(`${maintenancePageURL}/`);
  });

  it('should redirect to the maintenance page from the subpage', async () => {
    const request = new IncomingRequest(`${mainPage}/about`);
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, env, ctx);
    await waitOnExecutionContext(ctx);
    expect(response.headers.get('location')).toBe(`${maintenancePageURL}/`);
  });

  it('should not redirect the maintenance page itself', async () => {
    fetchMock
      .get(maintenancePageURL)
      .intercept({ path: '/' })
      .reply(200, maintenanceSnapshot);
    const request = new IncomingRequest(`${maintenancePageURL}/`);
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, env, ctx);
    await waitOnExecutionContext(ctx);
    expect(await response.text()).toMatchInlineSnapshot(`"${maintenanceSnapshot}"`);
  });

  it('should not redirect if that page has been added to the exceptions in the env variables', async () => {
    fetchMock
      .get(mainPage)
      .intercept({ path: '/about' })
      .reply(200, productionSnapshot);
    const request = new IncomingRequest(`${mainPage}/about`);
    const ctx = createExecutionContext();
    const response = await worker.fetch(
      request,
      { ...env, ALLOWED_ENDPOINTS: `${mainPage}/about` },
      ctx,
    );
    await waitOnExecutionContext(ctx);
    expect(await response.text()).toMatchInlineSnapshot(`"${productionSnapshot}"`);
  });

  it('should not redirect from the specific IP address', async () => {
    fetchMock
      .get(mainPage)
      .intercept({ path: '/' })
      .reply(200, productionSnapshot);
    const request = new IncomingRequest(mainPage, {
      headers: {
        'cf-connecting-ip': '127.0.0.1',
      },
    });
    const ctx = createExecutionContext();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const response = await worker.fetch(request, env, ctx);
    await waitOnExecutionContext(ctx);
    expect(await response.text()).toMatchInlineSnapshot(`"${productionSnapshot}"`);
    // expect(1).toBe(1);
  });
});
