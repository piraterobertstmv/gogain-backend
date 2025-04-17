# GoGain Backend

## Environment Setup

### Required Environment Variables

Make sure to set the following environment variables in your hosting platform (Render):

1. `MONGO_URL`: MongoDB connection string
   ```
   mongodb+srv://amoyavalls:IEHQ4ksdLTyMMZed@cluster0.pa3o6zg.mongodb.net/gogain?retryWrites=true&w=majority&appName=Cluster0
   ```

2. `JWT_SECRET`: Secret key for JWT authentication
   ```
   8f45d7a2e4b3c9f6h1j8k5l2m9n4p7q0r3s6t9v2w5x8y1z4a7b0c3d6e9g2
   ```

3. `NODE_ENV`: Set this to "production" for production environments
   ```
   production
   ```

### Setting up on Render

1. Navigate to your service dashboard on Render
2. Click on "Environment" in the left sidebar
3. Add each of the above environment variables
4. Click "Save Changes"
5. Redeploy your service

## Default Admin User

An admin user is automatically created if it doesn't exist:

- Email: admin@gogain.com
- Password: GogainAdmin123!

## API Endpoints

- POST /users/login - Login with email and password
- GET /users/me - Get current user with token
- GET /transaction - Get all transactions
- GET /client - Get all clients
- GET /center - Get all centers
- GET /service - Get all services