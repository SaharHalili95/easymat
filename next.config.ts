import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The syllabus is read with fs at request time, so the tracer cannot see it.
  outputFileTracingIncludes: {
    '/api/chat': ['./vault/syllabus/**/*'],
  },
};

export default nextConfig;
