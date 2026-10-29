const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

// ===============================
// 1. KET NOI MONGODB ATLAS
// ===============================

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI;

// ===============================
// 2. KHAI BAO MODEL FOOD
// ===============================

const foodSchema = new mongoose.Schema(
  {
    foodId: {
      type: String,
      required: [true, "Ma mon an la bat buoc"],
      unique: true,
      trim: true
    },

    name: {
      type: String,
      required: [true, "Ten mon an la bat buoc"],
      trim: true
    },

    category: {
      type: String,
      required: [true, "Loai mon an la bat buoc"],
      trim: true
    },

    cuisine: {
      type: String,
      required: [true, "Vung mien la bat buoc"],
      trim: true
    },

    ingredients: {
      type: [String],
      default: []
    },

    price: {
      type: Number,
      required: [true, "Gia mon an la bat buoc"],
      min: [0, "Gia khong duoc am"]
    },

    quantity: {
      type: Number,
      required: [true, "So luong la bat buoc"],
      min: [0, "So luong khong duoc am"],
      validate: {
        validator: Number.isInteger,
        message: "So luong phai la so nguyen"
      }
    },

    description: {
      type: String,
      default: ""
    },

    imageUrl: {
      type: String,
      default: ""
    }
  },
  {
    timestamps: true
  }
);

const Food = mongoose.model("Food", foodSchema);

// ===============================
// 3. API KIEM TRA HOAT DONG
// ===============================

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    message: "Backend API dang hoat dong",
    database: mongoose.connection.readyState === 1
      ? "connected"
      : "disconnected"
  });
});

// ===============================
// 4. API LAY DANH SACH / TIM KIEM
// GET /api/foods
// GET /api/foods?search=pho
// ===============================

app.get("/api/foods", async (req, res, next) => {
  try {
    const { search } = req.query;

    let filter = {};

    if (search && search.trim()) {
      const keyword = search.trim();
      const regex = new RegExp(
        keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        "i"
      );

      filter = {
        $or: [
          { name: regex },
          { category: regex },
          { cuisine: regex }
        ]
      };
    }

    const foods = await Food.find(filter).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: foods.length,
      data: foods
    });
  } catch (error) {
    next(error);
  }
});

// ===============================
// 5. API LAY CHI TIET MON AN
// GET /api/foods/:id
// ===============================

app.get("/api/foods/:id", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "ID mon an khong hop le"
      });
    }

    const food = await Food.findById(req.params.id);

    if (!food) {
      return res.status(404).json({
        success: false,
        message: "Khong tim thay mon an"
      });
    }

    res.status(200).json({
      success: true,
      data: food
    });
  } catch (error) {
    next(error);
  }
});

// ===============================
// 6. API THEM MON AN
// POST /api/foods
// ===============================

app.post("/api/foods", async (req, res, next) => {
  try {
    const {
      foodId,
      name,
      category,
      cuisine,
      ingredients,
      price,
      quantity,
      description,
      imageUrl
    } = req.body;

    if (
      typeof foodId !== "string" || !foodId.trim() ||
      typeof name !== "string" || !name.trim() ||
      typeof category !== "string" || !category.trim() ||
      typeof cuisine !== "string" || !cuisine.trim() ||
      price === undefined || price === null || price === "" ||
      quantity === undefined || quantity === null || quantity === ""
    ) {
      return res.status(400).json({
        success: false,
        message: "Vui long nhap day du ma, ten, loai, vung mien, gia va so luong"
      });
    }

    if (
      !Number.isFinite(Number(price)) ||
      Number(price) < 0 ||
      !Number.isInteger(Number(quantity)) ||
      Number(quantity) < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Gia phai la so khong am; so luong phai la so nguyen khong am"
      });
    }

    if (
      ingredients !== undefined &&
      (!Array.isArray(ingredients) ||
       !ingredients.every(item => typeof item === "string"))
    ) {
      return res.status(400).json({
        success: false,
        message: "ingredients phai la danh sach chuoi"
      });
    }

    const existingFood = await Food.findOne({
      foodId: foodId.trim()
    });

    if (existingFood) {
      return res.status(409).json({
        success: false,
        message: "Ma foodId da ton tai"
      });
    }

    const food = await Food.create({
      ...req.body,
      foodId: foodId.trim(),
      name: name.trim(),
      category: category.trim(),
      cuisine: cuisine.trim(),
      price: Number(price),
      quantity: Number(quantity)
    });

    res.status(201).json({
      success: true,
      message: "Them mon an thanh cong",
      data: food
    });
  } catch (error) {
    next(error);
  }
});

// ===============================
// 7. API CAP NHAT MON AN
// PUT /api/foods/:id
// ===============================

app.put("/api/foods/:id", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "ID mon an khong hop le"
      });
    }

    const allowedFields = [
      "foodId",
      "name",
      "category",
      "cuisine",
      "ingredients",
      "price",
      "quantity",
      "description",
      "imageUrl"
    ];

    const updates = {};

    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Khong co du lieu hop le de cap nhat"
      });
    }

    for (const field of ["foodId", "name", "category", "cuisine"]) {
      if (
        field in updates &&
        (typeof updates[field] !== "string" || !updates[field].trim())
      ) {
        return res.status(400).json({
          success: false,
          message: `${field} khong duoc de trong`
        });
      }

      if (field in updates) {
        updates[field] = updates[field].trim();
      }
    }

    if (
      "price" in updates &&
      (
        updates.price === "" ||
        updates.price === null ||
        !Number.isFinite(Number(updates.price)) ||
        Number(updates.price) < 0
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Gia khong hop le"
      });
    }

    if ("price" in updates) {
      updates.price = Number(updates.price);
    }

    if (
      "quantity" in updates &&
      (
        updates.quantity === "" ||
        updates.quantity === null ||
        !Number.isInteger(Number(updates.quantity)) ||
        Number(updates.quantity) < 0
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "So luong phai la so nguyen khong am"
      });
    }

    if ("quantity" in updates) {
      updates.quantity = Number(updates.quantity);
    }

    if (
      "ingredients" in updates &&
      (
        !Array.isArray(updates.ingredients) ||
        !updates.ingredients.every(item => typeof item === "string")
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "ingredients phai la danh sach chuoi"
      });
    }

    if ("foodId" in updates) {
      const duplicate = await Food.findOne({
        foodId: updates.foodId,
        _id: { $ne: req.params.id }
      });

      if (duplicate) {
        return res.status(409).json({
          success: false,
          message: "Ma foodId da duoc su dung"
        });
      }
    }

    const food = await Food.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      {
        new: true,
        runValidators: true
      }
    );

    if (!food) {
      return res.status(404).json({
        success: false,
        message: "Khong tim thay mon an"
      });
    }

    res.status(200).json({
      success: true,
      message: "Cap nhat mon an thanh cong",
      data: food
    });
  } catch (error) {
    next(error);
  }
});

// ===============================
// 8. API XOA MON AN
// DELETE /api/foods/:id
// ===============================

app.delete("/api/foods/:id", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "ID mon an khong hop le"
      });
    }

    const food = await Food.findByIdAndDelete(req.params.id);

    if (!food) {
      return res.status(404).json({
        success: false,
        message: "Khong tim thay mon an"
      });
    }

    res.status(200).json({
      success: true,
      message: "Xoa mon an thanh cong",
      data: food
    });
  } catch (error) {
    next(error);
  }
});

// ===============================
// 9. XU LY DUONG DAN KHONG TON TAI
// ===============================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "API khong ton tai"
  });
});

// ===============================
// 10. XU LY LOI
// ===============================

app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  if (err.code === 11000) {
    return res.status(409).json({
      success: false,
      message: "Du lieu bi trung, foodId phai la duy nhat"
    });
  }

  if (err.name === "ValidationError" || err.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: "Du lieu khong hop le",
      error: err.message
    });
  }

  console.error(err);

  res.status(500).json({
    success: false,
    message: "Loi server hoac co so du lieu"
  });
});

// ===============================
// 11. KHOI DONG SERVER
// ===============================

async function startServer() {
  if (!MONGODB_URI) {
    console.error("Thieu bien moi truong MONGODB_URI");
    process.exit(1);
  }

  try {
    await mongoose.connect(MONGODB_URI);

    console.log("Da ket noi MongoDB Atlas");

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Backend dang chay tai cong ${PORT}`);
    });
  } catch (error) {
    console.error("Khong the ket noi MongoDB Atlas:", error.message);
    process.exit(1);
  }
}

startServer();
