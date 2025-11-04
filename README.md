
  # Product Listing Application

  This is a code bundle for Product Listing Application. The original project is available at https://www.figma.com/design/H06MnYCxczZSBt3LMXvWrf/Product-Listing-Application.

  ## Running the code

  Run `npm i` to install the dependencies.

  Run `npm run dev` to start the development server.

  ## Error Monitoring with Sentry

  This application includes Sentry error monitoring for both frontend and backend. To set up Sentry:

  1. See the comprehensive [Sentry Setup Guide](SENTRY_SETUP_GUIDE.md)
  2. Create a Sentry account at [sentry.io](https://sentry.io)
  3. Add your Sentry DSN to environment variables:
     - Backend: `SENTRY_DSN` in `backend/.env`
     - Frontend: `VITE_SENTRY_DSN` in `.env`
  4. Enable error reporting: Set `VITE_ENABLE_ERROR_REPORTING=true` in `.env`

  For detailed instructions, troubleshooting, and best practices, refer to [SENTRY_SETUP_GUIDE.md](SENTRY_SETUP_GUIDE.md).
  