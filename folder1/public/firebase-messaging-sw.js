self.addEventListener('push', function(event) {
	try {
		const data = event.data ? event.data.json() : {};
		const notification = data.notification || {};
		const title = notification.title || 'Alert';
		const body = notification.body || '';
		const options = {
			body,
			icon: '/agri-icon.png',
			badge: '/agri-icon.png',
			data: data.data || {},
			renotify: true
		};
		event.waitUntil(self.registration.showNotification(title, options));
	} catch (e) {
		// Fallback: show a generic notification
		event.waitUntil(self.registration.showNotification('Alert', { body: 'You have a new message' }));
	}
});

self.addEventListener('notificationclick', function(event) {
	event.notification.close();
	const targetUrl = event.notification?.data?.url || '/';
	event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
		for (let client of windowClients) {
			if ('focus' in client) {
				client.navigate(targetUrl);
				return client.focus();
			}
		}
		if (clients.openWindow) {
			return clients.openWindow(targetUrl);
		}
	}));
}); 