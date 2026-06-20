import "dotenv/config";
import { defineConfig, env } from "prisma/config";

const getDatabaseUrl = () => {
  const url = env("DATABASE_URL");
  if (url && url.startsWith("file:./") && !url.startsWith("file:./prisma/")) {
    return url.replace("file:./", "file:./prisma/");
  }
  return url;
};

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: getDatabaseUrl(),
  },
});
