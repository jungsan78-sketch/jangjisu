export function createCompactCronResponse(res, summarize) {
  let statusCode = 200;

  return {
    setHeader(name, value) {
      res.setHeader(name, value);
      return this;
    },
    status(code) {
      statusCode = Number(code) || 200;
      return this;
    },
    json(payload) {
      const summary = summarize(payload || {}, statusCode);
      const responseStatus = summary?.ok === false && statusCode < 400 ? 502 : statusCode;
      return res.status(responseStatus).json(summary);
    },
  };
}
