/* GraphQL playground GET handler at /api/graphql-playground. */
import config from '@payload-config';
import { GRAPHQL_PLAYGROUND_GET } from '@payloadcms/next/routes';

export const GET = GRAPHQL_PLAYGROUND_GET(config);
