const express = require("express");
const mongoose = require("mongoose");
require('dotenv').config();

const app = express();
app.use(express.json());



mongoose.connect(process.env.MONGO_URL, {
}).then(() => console.log("MongoDB Connected"))
  .catch(err => console.error(err));

const SalesSchema = new mongoose.Schema({
    orderId: Number,
    customer: String,
    category: String,
    totalAmount: Number,
    items: Number,
    date: String,
    paymentMethod: String,
    status: String
});

const Sale = mongoose.model("Sales", SalesSchema);

const CustomerSchema = new mongoose.Schema({
    _id: Number,  // Matching the `customer` field in Sales
    name: String,
    email: String,
    location: String,
    age: Number
});

const Customer = mongoose.model("customers", CustomerSchema);

const ProductSchema = new mongoose.Schema({
    _id: Number,  // Unique product ID
    name: String,
    category: String,  // Matches `sales.category`
    price: Number,
    stock: Number
});

const Product = mongoose.model("products", ProductSchema);



app.get("/total-sales-per-category", async (req, res) => {
    const result = await Sale.aggregate([
        { $group: { _id: "$category", totalSales: { $sum: "$totalAmount" } } }
    ]);
    res.json(result);
});



app.get("/popular-payment-method", async (req, res) => {
    const result = await Sale.aggregate([
        { $group: { _id: "$paymentMethod", totalUsers: { $sum: 1 }}},
        { $sort: { totalUsers: -1 }},
        { $limit: 1 }
    ]);
    res.json(result);
});



app.get("/top-customers", async (req, res) => {
    const result = await Sale.aggregate([
        { $group: { _id: "$customer", totalAmount: { $sum: "$totalAmount"}} },
        { $sort: { totalAmount: -1 }},
        { $limit: 1 }
    ]);
    res.json(result);
});



app.get("/orders-per-day", async (req, res) => {
    const result = await Sale.aggregate([
        { $group: { _id: "$date", count: { $sum: 1 }}}
    ]);
    res.json(result);
});



app.get("/filter-by-payment/:method", async (req, res) => {
    const method = req.params.method;
    const result = await Sale.aggregate([
        { $match: { paymentMethod: method} }
    ]);
    res.json(result);
});



app.get("/sales-with-customers", async (req, res) => {
    const result = await Sale.aggregate([
        {
            $lookup: {
                from: "customers",
                localField: "customer",
                foreignField: "_id",
                as: "customerDetails"
            }
        },
        {
            $unwind: "$customerDetails" // Convert array to object
        },
        {
            $project: {
                _id: 0,
                orderId: 1,
                totalAmount: 1,
                items: 1,
                date: 1,
                paymentMethod: 1,
                status: 1,
                customerName: "$customerDetails.name",
                customerEmail: "$customerDetails.email",
                customerLocation: "$customerDetails.location",  // Updated field
                customerAge: "$customerDetails.age"
            }
        }
    ]);
    
    res.json(result);
});



app.get("/top-category", async (req, res) => {
    const method = req.params.method;
    const result = await Sale.aggregate([
        { $group: { _id: "$category", totalSales: { $sum: "$totalAmount"}}},
        { $sort: { totalSales: -1}}
    ]);
    res.json(result);
});



app.get("/monthly-sales", async (req, res) => {
    const result = await Sale.aggregate([
        { 
            $group: { 
                _id: { $substr: ["$date", 0, 7] }, // Extract YYYY-MM from date
                totalRevenue: { $sum: "$totalAmount" }
            } 
        },
        { $sort: { "_id": 1 } }, // Sort by month
        { 
            $project: { 
                _id: 0, 
                month: "$_id", 
                totalRevenue: 1 
            } 
        }
    ]);
    res.json(result);
});



app.get("/repeat-customers", async (req, res) => {
    const result = await Sale.aggregate([
        { 
            $group: { 
                _id: "$customer", 
                totalOrders: { $sum: 1 } 
            } 
        },
        { $match: { totalOrders: { $gt: 1 } } }, // Only customers with more than 1 order
        { 
            $project: { 
                _id: 0, 
                customer: "$_id", 
                totalOrders: 1 
            } 
        }
    ]);
    res.json(result);
});



app.get("/order-summary", async (req, res) => {
    const result = await Sale.aggregate([
        { 
            $lookup: { 
                from: "customers", 
                localField: "customer", 
                foreignField: "_id", 
                as: "customerDetails" 
            } 
        },
        { $unwind: "$customerDetails" }, // Flatten array
        { 
            $addFields: { 
                location: "$customerDetails.location", 
                tax: { $multiply: ["$totalAmount", 0.1] } 
            } 
        },
        { 
            $project: { 
                _id: 0, 
                customer: 1, 
                location: 1, 
                totalAmount: 1, 
                tax: 1, 
                status: 1 
            } 
        }
    ]);
    res.json(result);
});



app.get("/avg-order-value", async (req, res) => {
    const result = await Sale.aggregate([
        { 
            $group: { 
                _id: "$category", 
                totalSales: { $sum: "$totalAmount" }, 
                totalOrders: { $sum: 1 }
            } 
        },
        { 
            $addFields: { 
                avgOrderValue: { $divide: ["$totalSales", "$totalOrders"] }
            } 
        },
        { 
            $project: { 
                _id: 0, 
                category: "$_id", 
                totalSales: 1, 
                totalOrders: 1, 
                avgOrderValue: 1 
            } 
        }
    ]);
    res.json(result);
});



app.get("/", (req, res) => {
    res.send("hello, world")
})

app.listen(process.env.PORT)