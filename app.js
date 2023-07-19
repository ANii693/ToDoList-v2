const express = require("express");
const bodyParser = require("body-parser");
const date = require(__dirname + "/date.js");
const mongoose = require("mongoose");
const _ = require("lodash");
require("dotenv").config();

const app = express();

const  PORT = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

app.set("view engine", "ejs");

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.DB_URL);
    console.log('MongoDB Connected');
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
};

mongoose
  .connect(process.env.DB_URL)
  .then(async () => {

connectDB()
  .then(() => {
    const itemsSchema = new mongoose.Schema({
      name: String,
    });

    const Item = mongoose.model("Item", itemsSchema);

    const listSchema = new mongoose.Schema({
      nameOfList: String,
      items: [itemsSchema],
    });

    const List = mongoose.model("List", listSchema);

    const defaultItems = [
      { name: "Welcome to your todolist!" },
      { name: "Hit the + button to add a new item" },
      { name: "<-- Hit thes to delete an item." },
    ];

    app.get("/", async function (req, res) {
      let day = date.getDate();
      await Item.find()
        .exec()
        .then(async (data) => {
          if (data.length == 0) {
            await Item.insertMany(defaultItems)
              .then(() => {
                console.log(
                  "the default document have been inserted into the todolistdb"
                );
                res.redirect("/");
              })
              .catch((err) => {
                console.log(err);
              });
          } else {
            res.render("list", { listTitle: day, newAddedItems: data });
          }
        })
        .catch((err) => {
          console.log(err);
        });
    });

    app.post("/", async function (req, res) {
      const listName = req.body.list;
      const title = _.words(listName)[0];
      const day = date.getDate();
      const dayName = _.words(day)[0];
      const itemName = new Item({
        name: req.body.newItem,
      });
      if (title === dayName) {
        if (_.trim(req.body.newItem) != "") {
          await Item.findOne({ name: _.trim(req.body.newItem) })
            .exec()
            .then(async (data) => {
              if (!data) {
                await itemName.save();
              }
              res.redirect("/");
            })
            .catch((err) => {
              console.log(err);
            });
        } else {
          res.redirect("/");
        }
      } else {
        if (_.trim(req.body.newItem) != "") {
          await List.findOne({ nameOfList: listName })
            .exec()
            .then(async (data) => {
              var flag = 1;
              data.items.forEach((obj) => {
                if (obj.name === _.trim(req.body.newItem)) {
                  flag = 0;
                }
              });
              if (flag) {
                data.items.push(itemName);
                await data.save();
              }
              res.redirect("/" + listName);
            })
            .catch((err) => {
              console.log(err);
            });
        } else {
          res.redirect("/" + listName);
        }
      }
    });

    app.post("/delete", async function (req, res) {
      const listName = req.body.listName;
      const title = _.words(listName)[0];
      const day = date.getDate();
      const dayName = _.words(day)[0];
      const id = req.body.checkbox;

      if (dayName === title) {
        await Item.deleteOne({ _id: req.body.checkbox });
        res.redirect("/");
      } else {
        List.findOneAndUpdate(
          { nameOfList: listName },
          { $pull: { items: { _id: id } } }
        ) 
          .then(() => {
            res.redirect("/" + listName);
          })
          .catch((err) => {
            console.log(err);
          });
      }
    });

    app.get("/:list", async function (req, res) {
      await List.findOne({ nameOfList: _.capitalize(req.params.list) })
        .exec()
        .then(async (data) => {
          if (data === null) {
            const list = new List({
              nameOfList: _.capitalize(req.params.list),
              items: [],
            });
            await list.save();
            res.redirect("/" + req.params.list);
          } else {
            res.render("list", {
              listTitle: data.nameOfList,
              newAddedItems: data.items,
            });
          }
        })
        .catch((err) => {
          console.log(err);
        });
    });

    app.post("/newList", function (req, res) {
      res.redirect("/" + req.body.newList);
    });

    app.listen(PORT, function () {
      console.log(`server is started on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.log(err);
    mongoose.disconnect();
  });
