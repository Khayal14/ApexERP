import json
from channels.generic.websocket import AsyncJsonWebsocketConsumer


class NotificationConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        self.user = self.scope['user']
        if self.user.is_anonymous:
            await self.close()
            return
        self.room_name = f'user_{self.user.id}'
        self.company_room = f'company_{self.user.company_id}'
        await self.channel_layer.group_add(self.room_name, self.channel_name)
        await self.channel_layer.group_add(self.company_room, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, 'room_name'):
            await self.channel_layer.group_discard(self.room_name, self.channel_name)
            await self.channel_layer.group_discard(self.company_room, self.channel_name)

    async def receive_json(self, content):
        msg_type = content.get('type', 'echo')
        if msg_type == 'ping':
            await self.send_json({'type': 'pong'})

    async def notification_message(self, event):
        await self.send_json(event['data'])

    async def data_update(self, event):
        await self.send_json({'type': 'data_update', **event['data']})
