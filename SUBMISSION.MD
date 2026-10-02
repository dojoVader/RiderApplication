## Which parts of the assessment did you complete?
- Authentication & Authorization 
- Database & Prisma
- Database & Prisma
- Firebase Cloud Messaging
- Real-Time Communication
- Redis & Background Jobs
- NextJS / ReactJS
- Documentation


## Which parts did you intentionally leave incomplete, and why?

- OpenTelemetry: I didn;t have time to implement it. Plus I am not familiar with OpenTelemetry, only Prometheus and Grafana.

## What would you improve if you had another 2–3 days?

- If Allowed , I would have implemented the Observability part using the aforementioned tools.
- Multi-instance deployment using Kubernetes for scaling the application and adopting Fastify.


## How would you scale this system to support 10,000 concurrent rides?
- I would have used Redis for caching the rides and Fastify for scaling the application.
- Deployed Multiple instances of the application using Kubernetes and Nginx as load balancer.
- Implementation of a Queue system to handle the jobs.


## What security considerations would you address before taking this system to production?

- Keep the environment variables secure and have them set in the host to be picked up by Docker.
- Behind a Firewall and using a Reverse Proxy.
- Block external access to the Database only the container is allowed to access.
- Implementing a Rate Limiting system.

## What assumptions did you make?

- Using Nginx as a reverse proxy to simplify having separate domains and the need for CORS. 
