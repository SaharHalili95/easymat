import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // These are read with fs at request time, so the tracer cannot see them.
  outputFileTracingIncludes: {
    '/api/chat': ['./vault/syllabus/**/*'],
    '/api/practice': ['./vault/questions/**/*'],
    '/api/practice/answer': ['./vault/questions/**/*'],
  },
};

export default nextConfig;
