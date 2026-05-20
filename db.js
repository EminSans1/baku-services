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
  },
  avatar_url: {
    type: Sequelize.STRING,
    allowNull: true
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
  },
  type: {
    type: Sequelize.STRING,
    allowNull: false,
    defaultValue: 'service'
  },
  condition: {
    type: Sequelize.STRING,
    allowNull: true
  },
  trade_possible: {
    type: Sequelize.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  price_type: {
    type: Sequelize.STRING,
    allowNull: false,
    defaultValue: 'fixed'
  },
  images: {
    type: Sequelize.TEXT,
    allowNull: true
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

// Safe migration function to run before sync
async function syncDatabase() {
  const queryInterface = sequelize.getQueryInterface();

  const safeAddColumn = async (tableName, columnName, definition) => {
    try {
      await queryInterface.addColumn(tableName, columnName, definition);
      console.log(`[Migration] Column '${columnName}' successfully added to table '${tableName}'.`);
    } catch (err) {
      console.log(`[Migration] Column '${columnName}' in table '${tableName}' already exists or skipped: ${err.message}`);
    }
  };

  // Add avatar_url to users
  await safeAddColumn('users', 'avatar_url', {
    type: Sequelize.STRING,
    allowNull: true
  });

  // Add type to ads
  await safeAddColumn('ads', 'type', {
    type: Sequelize.STRING,
    allowNull: false,
    defaultValue: 'service'
  });

  // Add condition to ads
  await safeAddColumn('ads', 'condition', {
    type: Sequelize.STRING,
    allowNull: true
  });

  // Add trade_possible to ads
  await safeAddColumn('ads', 'trade_possible', {
    type: Sequelize.BOOLEAN,
    allowNull: false,
    defaultValue: false
  });

  // Add price_type to ads
  await safeAddColumn('ads', 'price_type', {
    type: Sequelize.STRING,
    allowNull: false,
    defaultValue: 'fixed'
  });

  // Add images to ads
  await safeAddColumn('ads', 'images', {
    type: Sequelize.TEXT,
    allowNull: true
  });

  // Run native sync
  await sequelize.sync();
  console.log('[Database] Sync completed successfully.');
}

module.exports = {
  sequelize,
  User,
  Ad,
  syncDatabase
};
