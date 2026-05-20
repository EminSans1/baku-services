const { Sequelize } = require('sequelize');

let sequelize;

if (process.env.USE_SQLITE === 'true' || !process.env.DATABASE_URL) {
  // Use SQLite for local development
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: './db.sqlite',
    logging: false
  });
  console.log('Database: Using SQLite (db.sqlite)');
} else {
  // Use PostgreSQL for production (Render)
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    protocol: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    },
    logging: false
  });
  console.log('Database: Using PostgreSQL (DATABASE_URL)');
}

// Define User model
const User = sequelize.define('User', {
  id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  fullname: {
    type: Sequelize.STRING,
    allowNull: false
  },
  email: {
    type: Sequelize.STRING,
    allowNull: false,
    unique: true
  },
  phone: {
    type: Sequelize.STRING
  },
  password: {
    type: Sequelize.STRING,
    allowNull: false
  }
}, {
  tableName: 'users',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// Define Ad model
const Ad = sequelize.define('Ad', {
  id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: Sequelize.STRING
  },
  title: {
    type: Sequelize.STRING
  },
  category: {
    type: Sequelize.STRING
  },
  price: {
    type: Sequelize.STRING
  },
  description: {
    type: Sequelize.TEXT
  },
  user_id: {
    type: Sequelize.INTEGER,
    references: {
      model: User,
      key: 'id'
    }
  }
}, {
  tableName: 'ads',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// Define Relationships
User.hasMany(Ad, { foreignKey: 'user_id', as: 'ads' });
Ad.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

module.exports = {
  sequelize,
  User,
  Ad
};
