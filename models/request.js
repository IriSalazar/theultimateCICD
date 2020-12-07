const { Sequelize } = require('sequelize');


module.exports = (sequelize, DataTypes) => {
  const Request = sequelize.define('request', {
    chatRoomId: {
      allowNull: false,
      primaryKey: true,
      type: Sequelize.INTEGER,
    },
    userId: {
      type: DataTypes.STRING,
      allowNull: false,
      primaryKey: true,
      type: Sequelize.INTEGER,
    },
    admitted: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    }
  }, {
      tableName: 'requests',
  });
  return Request;
};
