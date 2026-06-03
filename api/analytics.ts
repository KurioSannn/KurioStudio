type VercelRequest = {
  method?: string;
  body?: any;
};

type VercelResponse = {
  status: (code: number) => VercelResponse;
  json: (body: unknown) => void;
  setHeader: (key: string, value: string) => void;
};

function parseBody(req: VercelRequest) {
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return req.body || {};
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "OPTIONS") {
    res.setHeader("Allow", "POST, OPTIONS");
    res.status(204).json({});
    return;
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ success: false, message: "Method not allowed" });
    return;
  }

  const { event, payload, path: appPath, timestamp } = parseBody(req);

  if (!event || typeof event !== "string") {
    res.status(400).json({ success: false, message: "event property is required" });
    return;
  }

  console.info("[analytics]", {
    event,
    path: appPath || "",
    timestamp: timestamp || new Date().toISOString(),
    payload: payload || {},
  });

  res.status(200).json({ success: true });
}
