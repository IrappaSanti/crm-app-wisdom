# CRM Backend APIMore actions

This project is a backend application for a Customer Relationship Management (CRM) system. It is built using **Node.js** and provides various APIs to manage users, customers, and their assignments efficiently. Authentication is handled using **JWT (JSON Web Tokens)**, and role-based access control ensures secure and restricted data access.

---

# Postman API testing

LINK - [click here](https://warped-rocket-262187.postman.co/workspace/New-Team-Workspace~17fa8346-d035-4753-976f-8a16e2adb7e2/collection/41515979-6ae238dc-ccf8-40d9-9979-7e4831cb12f3?action=share&creator=41515979)

---

## Features
- User Authentication and Role-Based Access Control (Admin/User roles).
- APIs to manage customers (Add, Update, Delete, and Retrieve).
- APIs for user profile management.
- Customer assignments to users with filtering and sorting options.
- Automatic reassignment of customers when users are deleted.

---

## API Overview


### GET Methods

- **Get Customers Assigned to a User or All Customers (Admin)**  
  `GET /customers`  
  User can get the details of customers assigned to them. If the user role is admin, they can access all customer details.

- **Get Specific Customer Details**  
  `GET /customer/:id`  
  Only the user can access the details of the customer assigned to them.

- **Get All Users (Admin) or Own Details (User)**  
  `GET /users`  
  Admins can access all users' data, while users can only get their own details.

- **Filter and Paginate Customer Details**  
  `GET /customers/?name=Bob&company=xyz&offset=0&limit=3&order_by=id&order=ASC`  
  Users can access customer details assigned to them with filtering options.

- **View User Profile**  
  `GET /profile`  
  Users can see their profile details.

---

### POST Methods

- **Register a User**  
  `POST /register`  
  Used to register a new user.

- **Login a User**  
  `POST /login`  
  Used to authenticate a user and return a JWT token.

- **Add a Customer**  
  `POST /`  
  Users can add a new customer.

---

### PUT Methods

- **Update Customer Details**  
  `PUT /customer/:id`  
  Admins can update any customer. Users can update details of the customers assigned to them.

---

### DELETE Methods

- **Delete a Customer**  
  `DELETE /customer/:id`  More actions
  Users can delete customers assigned to them. Admins have access to delete any customer.

- **Delete a User**  
  `DELETE /user/:id`  
  Admins can delete users. Customers of deleted users are automatically reassigned to other users.
  
