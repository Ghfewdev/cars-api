require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");
const bodyParser = require('body-parser')
const jsonParser = bodyParser.json();
const xl = require('excel4node');

const app = express();
const conn = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_DATABASE
})
const bcrypt = require('bcrypt');
const saltRounds = 10;
const jwt = require('jsonwebtoken');
const secect = 'abcdefg'

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.send("API")
})

app.get("/users", jsonParser, (req, res) => {
    conn.query("SELECT * FROM users", (err, t1) => {
        res.send(t1)
    })
})

app.post('/login', jsonParser, (req, res, next) => {
    var qsql = "SELECT * FROM users WHERE us_name = ?"
    var qy = req.body.name
    conn.execute(qsql, [qy], (err, users, fields) => {
        if (err) { res.json({ status: 'error', massage: err }); return }
        if (users.length === 0) { res.json({ status: 'error', massage: 'no user not found' }); return }
        bcrypt.compare(req.body.password, users[0].us_password, (err, islogin) => {
            if (islogin) {
                var token = jwt.sign({ name: users[0].us_name }, secect, { expiresIn: '1h' }) + "$" + users[0].us_level;
                res.json({ status: 'ok', massage: 'login success', token, name: users[0].us_name, id: users[0].us_id, dep: users[0].us_dep });
            } else {
                res.json({ status: 'erorr', massage: 'login failed' })
            }
        })
    })
})

app.post('/authen', jsonParser, (req, res, next) => {
    try {
        const token = req.headers.authorization.split(" ")[1];
        const decoded = jwt.verify(token, secect);
        res.json({ status: 'ok', name: decoded.name, decoded });
    } catch (err) {
        res.json({ status: 'error', massage: err.message })
    }

});

app.get("/hospital", jsonParser, (req, res, next) => {
    conn.query("SELECT * FROM hospital", (err, t1) => {
        res.send(t1)
    })
})

app.get("/preflix", jsonParser, (req, res, next) => {
    conn.query("SELECT * FROM preflix", (err, t1) => {
        res.send(t1)
    })
})

app.get("/district", jsonParser, (req, res, next) => {
    conn.query("SELECT * FROM district", (err, t1) => {
        res.send(t1)
    })
})

app.post('/fill', jsonParser, (req, res, next) => {
    var Isql = "INSERT INTO `form` (`hos_id`, `date`, `citizen`, `pre_id`, `fname`, `lname`, `age`, `house`, `street`, `dis_id`, `subdis`, `zipcode`, `call`, `dateres`, `met_id`, `start`, `end`, `condition`, `editer`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    var IV = [req.body.hos, req.body.date, req.body.sitizen, req.body.preflix, req.body.fname, req.body.lname, req.body.age, req.body.num, req.body.streed, req.body.district, req.body.subdistrict, req.body.zip, req.body.call, req.body.dateres, req.body.met, req.body.start, req.body.end, req.body.condition, req.body.editer]
    conn.execute(Isql, IV, (err, results, fields) => {
        if (err) {
            res.json({ status: 'error', massage: err })
            return
        } else
            res.json({ status: 'ok' })
    })
})

app.get("/form", jsonParser, (req, res, next) => {
    conn.query("SELECT * FROM formcom ORDER BY form.fm_id DESC", (err, t1) => {
        t1 = t1.map(d => {
            if (d.date != null)
                d.date = "วันที่ " + d.date.toISOString().split('T')[0] + " เวลา " + (d.date.toISOString().split('T')[1]).split(".")[0] + " น.";
            if (d.dateres != null)
                d.dateres = " วันที่ " + d.dateres.toISOString().split('T')[0] + " เวลา " + (d.dateres.toISOString().split('T')[1]).split(".")[0] + " น.";
            return d;
        })
        res.send(t1)
    })
})

app.get("/form/users/:us", jsonParser, (req, res, next) => {
    const us = req.params.us
    conn.query("SELECT * FROM formcom WHERE hos_id = ? ORDER BY fm_id DESC", [us], (err, t1) => {
        t1 = t1.map(d => {
            if (d.date != null)
                d.date = "วันที่ " + d.date.toISOString().split('T')[0] + " เวลา " + (d.date.toISOString().split('T')[1]).split(".")[0] + " น.";
            if (d.dateres != null)
                d.dateres = " วันที่ " + d.dateres.toISOString().split('T')[0] + " เวลา " + (d.dateres.toISOString().split('T')[1]).split(".")[0] + " น.";
            return d;
        })
        res.send(t1)
    })
})

app.get("/form/:id", jsonParser, (req, res, next) => {
    const id = req.params.id
    conn.query("SELECT * FROM formcom WHERE formcom.fm_id = ?", [id], (err, t1) => {
        res.send(t1)
    })
})

app.post('/status', jsonParser, (req, res, next) => {
    var Isql = "INSERT INTO `carsmanage` (`us_id`, `fm_id`, `cm_status`, `cm_date`, `des`) VALUES (?, ?, ?, ?, ?)"
    var IV = [req.body.us_id, req.body.fm_id, req.body.cm_status, req.body.cm_date, req.body.des]
    conn.execute(Isql, IV, (err, results, fields) => {
        if (err) {
            res.json({ status: 'error', massage: err })
            return
        } else
            res.json({ status: 'ok' })
    })
})

app.put("/statu/edit/:id", jsonParser, (req, res, next) => {
    const id = req.params.id
    const d = new Date()
    var t = d.getFullYear() + "/" + d.getMonth() + "/" + d.getDate() + " " + d.getHours() + ":" + d.getMinutes() + ":" + d.getSeconds()
    const sql = "UPDATE `carsmanage` SET `cm_status` = '0', `cm_date` = ?, `des` = '?' WHERE `carsmanage`.`cm_id` = ?";
    conn.execute(sql, [t, req.body.des, id], (err, ev, fields) => {
        if (err) {
            res.json({ status: "erorr", massage: err });
            return;
        } else {
            res.json({ status: "ok" })
        }
    })
})



app.get("/excal/:id", (req, res) => {
    var id = req.params.id
    var sql = "SELECT * FROM formcom WHERE hos_id = ? ORDER BY fm_id ASC"
    if (id === "14")
    sql = "SELECT * FROM formcom ORDER BY fm_id ASC"
    conn.query(sql, [id], (err, t1) => {

        var wb = new xl.Workbook();
        var ws = wb.addWorksheet('Sheet 1');

        ws.cell(1, 1).string("ลำดับที่");
        ws.cell(1, 2).string("โรงพยาบาล");
        ws.cell(1, 3).string("วันที่จอง");
        ws.cell(1, 4).string("เลขบัตรประชาชน");
        ws.cell(1, 5).string("คำนำหน้าชื่อ");
        ws.cell(1, 6).string("ชื่อ");
        ws.cell(1, 7).string("นามสกุล");
        ws.cell(1, 8).string("อายุ(ปี)");
        ws.cell(1, 9).string("บ้านเลขที่");
        ws.cell(1, 10).string("ถนน");
        ws.cell(1, 11).string("แขวง");
        ws.cell(1, 12).string("เขต");
        ws.cell(1, 13).string("รหัสไปรษณี");
        ws.cell(1, 14).string("เบอร์โทรศัพท์");
        ws.cell(1, 15).string("วันที่ขอรถ");
        ws.cell(1, 16).string("วิธีการ");
        ws.cell(1, 17).string("ต้นทาง");
        ws.cell(1, 18).string("ปลายทาง");
        ws.cell(1, 19).string("เงื่อนไข");
        ws.cell(1, 20).string("ชื่อผู้บันทึก");
        ws.cell(1, 21).string("สถานะ");
        ws.cell(1, 22).string("หมายเหตุ");

        t1.map((t, i) => {
            ws.cell(i + 2, 1).number(t.fm_id);
            ws.cell(i + 2, 2).string(t.hos_name);
            ws.cell(i + 2, 3).string(t.date);
            ws.cell(i + 2, 4).string(t.citizen);
            ws.cell(i + 2, 5).string(t.pre_name);
            ws.cell(i + 2, 6).string(t.fname);
            ws.cell(i + 2, 7).string(t.lname);
            ws.cell(i + 2, 8).number(t.age);
            ws.cell(i + 2, 9).string(t.house);
            ws.cell(i + 2, 10).string(t.street);
            ws.cell(i + 2, 11).string(t.subdis);
            ws.cell(i + 2, 12).string(t.dis_name);
            ws.cell(i + 2, 13).string(t.zipcode);
            ws.cell(i + 2, 14).string(t.call);
            ws.cell(i + 2, 15).string(t.dateres);
            ws.cell(i + 2, 16).string(t.met_name);
            ws.cell(i + 2, 17).string(t.start);
            ws.cell(i + 2, 18).string(t.end);
            ws.cell(i + 2, 19).string(t.condition);
            ws.cell(i + 2, 20).string(t.editer);
            ws.cell(i + 2, 21).number(t.status);
            ws.cell(i + 2, 22).string(t.des);
        })

        wb.write('ExcelFile.xlsx', res);
    })

})

const port = process.env.PORT || 3000
app.listen(port, () => {
    console.log("API Start on port: " + port)
})
