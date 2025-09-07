1. i18n translations must be build as a windsurf workflow, when new code is created dont add i18n translations
2. the usage of toastify needs to be explained better. It must never have any server-side error messages included etc
3. file upload needs to be implemented as a generic feature. goal is to have a minio instance in the stack (which can be scaled seperately later). the generic file upload feature must use pre-signed urls to upload files to minio, to allow very large uploads. the feature must provide also components for show upload progress etc
4. job queue must also be implemented as a generic feature. goal is to use the redis instance in the stack (which can be scaled seperately later). the generic job queue feature must provide a job queue for background processing of tasks. the feature must provide also components for show job queue status etc.
5. Shadcn components MUST be imported via the barrel export!! (e.g. import { Button, Select, Input, Label, Card, CardContent, CardHeader, CardTitle } from "@/features/shadcn/index.client" instead of all the single inputs!
6. rateLimit must be implemented in a generic way in the middleware. Reasonable limits for every request, stricter limits for POST requests.
7. Routes that require authentication must be protected by the middleware.
