import { config } from "../config";
import { PrismaClient } from "../generated/client/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: config.databaseUrl,
});
const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({ adapter });
