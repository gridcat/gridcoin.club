export interface Env {
  ALLOWED_ENDPOINTS?: string;
  MAINTENANCE_PAGE_URL?: string;
  ALLOWED_IPS?: string;
}

const DEFAULT_MAINTENCANCE_PAGE = 'https://maintenance.gridcoin.club/';

export default {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    const statusCode = 302;
    const allowedEndpoints = env.ALLOWED_ENDPOINTS ? env.ALLOWED_ENDPOINTS.trim().split(/,/) : [];
    // const allowedDomains = ['maintenance.gridcoin.club'];
    const maintenancePageURL = env.MAINTENANCE_PAGE_URL || DEFAULT_MAINTENCANCE_PAGE;
    // add the maintenance page host to the list of allowed domains
    allowedEndpoints.push((new URL(maintenancePageURL)).hostname);

    const allowedIPs = [
      '127.0.0.1', // To make a test case
      ...(env.ALLOWED_IPS ? env.ALLOWED_IPS.trim().split(/,/) : []),
    ];

    // console.log({ allowedIPs });
    // console.log({ allowedEndpoints });

    if (allowedEndpoints.some((u) => request.url.includes(u))) {
      // const original = await fetch(request);
      // return new Response(original.body, original);
      // console.log(`Allow this endpoint: ${request.url}`);
      return fetch(request) as any;
    }

    const ip = request.headers.get('cf-connecting-ip') || '';

    if (allowedIPs.includes(ip)) {
      // const original = await fetch(request);
      // return new Response(original.body, original);
      // console.log(`Allow this ip: ${ip}`);
      return fetch(request) as any;
    }

    // console.log(`Endpoint ${request.url} for ip ${ip} shall be under maintenance`);

    return Response.redirect(maintenancePageURL, statusCode);
  },
} satisfies ExportedHandler<Env>;
