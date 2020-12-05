# Documentación requisitos variables
## Cache
### RF1:
El uso de caché se logró con Redis, estando este encapsulado en Docker. La forma en que funciona es exponiendo el puerto 6379.

### RF2:
El primer caso de uso es para las salas de chat. En el caché se guardan las salas de chat creadas, que se muestran en el lobby. De esta forma, la velocidad del request aumenta considerablemente. La configuración aquí es la default (FIFO, sin expiración).
El segundo caso de uso es para los mensajes. En el caché se guardan los mensajes mandados en un chat en específico. La configuración de expiración es de 5 minutos por ahora. Esto se hace para que redis no colapse si es que se mandan demasiado mensajes. De esta forma mantenemos la eficiencia del caché.
La forma en que se logra guardar las salas de chat y los mensajes en el caché, es guardando los objetos JSON, pero en forma de string, para evitar los problemas de rendimiento y seguridad que tiene guardar JSONs directamente.
Al agregar objetos, se leen del caché, se parsean para obtener un array, y se usa el método push para agregar el objeto. Y al leer los objetos se leen en estilo FIFO (izquierda a derecha). Se usa este algoritmo por la lógica de arrays de javascript.

## Mensajes en tiempo real
### RF1:
Para este requisito se utilizó la librería de websockets de npm, socket.io, la cual tiene una parte escuchando conexiones y eventos en la aplicación de node en el backend, específicamente en el archivo server.js; por otro lado, en el frontend se encuentra dentro de la aplicación de react el código necesario para el lado del cliente de socket.io, utilizando la librería _SocketIOClient_ que se conecta al puerto en que está corriendo la aplicación node en el backend.
Las funciones más importantes para el funcionamiento del chat en tiempo real son:
- *socket.emit('new-connection', { data })*: conecta a un usuario al servidor que estaba previamente esperando conexiones.
- *socket.emit('send-chat-message', { data }*: función llamada luego de que un usuario ingresa y envía un mensaje, la cual llega al servidor y la redirige a los usuarios de esa sala.
- *socket.on('chat-message', { data })*: recibe la respuesta del servidor frente al evento de que un usuario en la misma sala mande un mensaje. Una vez que lo recibe, lo inserta dinámicamente en el DOM de todos los usuarios presentes en la sala.
- Las funciones restantes son para mejorar la estética de la página, mostrando el usuario que está escribiendo y los que ingresan o salen de la sala.

### RF2:
Para las menciones, se implementó una función que revisa el input una vez que el usuario lo ingresa y si contiene uno o más "@", obtiene los nombres de los usuarios mencionados en el mensaje y envía un post al backend, específicamente al endpoint chat/chatroom/:id/mention, donde se utiliza el paquete de npm llamado nodemailer para enviarle un correo a cada usuario mencionado. Para mencionar a un usuario, es necesario anteponer un @ a su nombre y se puede mencionar a múltiples usuarios en un mismo mensaje. Luego de esto, se muestra un mensaje en el chat indicando que se envió un mail a los usuarios mencionados. Por ejemplo:
- @usuario de ejemplo
- @usuario1 @usuario2
