export const config = {
  runtime: "nodejs",
};

const handler = async (req: unknown, res: unknown): Promise<void> => {
  try {
    const module = await import("./handler.js");
    const sharedHandler = module.default as (
      request: unknown,
      response: unknown
    ) => Promise<void>;
    await sharedHandler(req, res);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Jira route bootstrap failed";

    const response = res as {
      statusCode: number;
      setHeader: (name: string, value: string) => void;
      end: (payload: string) => void;
    };
    response.statusCode = 500;
    response.setHeader("Content-Type", "application/json");
    response.end(JSON.stringify({ error: message }));
  }
};

export default handler;
