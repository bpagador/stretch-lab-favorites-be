const express = require('express');
const cors = require('cors');
const client = require('./client.js');
const app = express();


app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const ensureAuth = require('./auth/ensure-auth');
const createAuthRoutes = require('./auth/create-auth-routes');
const authRoutes = createAuthRoutes({
  selectUser(email) {
    return client.query(`
            SELECT id, email, hash
            FROM users
            WHERE email = $1;
        `,
    [email]
    ).then(result => result.rows[0]);
  },
  insertUser(user, hash) {
    console.log(user);
    return client.query(`
            INSERT into users (email, hash)
            VALUES ($1, $2)
            RETURNING id, email;
        `,
    [user.email, hash]
    ).then(result => result.rows[0]);
  }
});

app.use('/auth', authRoutes);

app.use('/api', ensureAuth);

app.get('/api/favorites', async(req, res) => {
  const data = await client.query('SELECT * from favorites WHERE owner_id=$1', [req.userId]);

  res.json(data.rows);
});

app.post('/api/favorites', async(req, res) => {
  const data = await client.query(`
  INSERT INTO favorites (name, full_name, alter_egos, place_of_birth, first_appearance, publisher, alignment, owner_id)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
  returning *
  `, [req.body.name, req.body.full_name, req.body.alter_egos, req.body.place_of_birth, req.body.first_appearance, req.body.publisher, req.body.alignment, req.userId]);

  res.json(data.rows);
});

app.delete('/api/favorites/:id', async(req, res) => {
  const data = await client.query(`DELETE FROM favorites WHERE id=$1 AND owner_id=$2 
  returning *
  `, [req.params.id, req.userId]);
  res.json(data.rows);
});

app.use(require('./middleware/error'));

module.exports = app;
