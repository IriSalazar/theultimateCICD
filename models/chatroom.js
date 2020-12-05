const { Sequelize } = require('sequelize');


module.exports = (sequelize, DataTypes) => {
  const Chatroom = sequelize.define('chatroom', {
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: Sequelize.INTEGER,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    }, 
    userId: {
      type: DataTypes.STRING,
      allowNull: false,
    }
  }, {
      tableName: 'chatrooms',
  });
  return Chatroom;
};
