NAME = transcendence
USER = gavaniwast

CERT = volumes/ssl/$(NAME).pem

all: clean start

$(CERT):
	openssl req -newkey rsa:4096 -x509 -sha256 -days 365 -nodes \
	-out $(NAME).pem -keyout $(NAME).pem \
	-subj "/C=FR/ST=Nice/L=Nice/O=42/OU=student/CN=$(NAME)_$(USER)/"
	mkdir -p volumes/ssl
	mv $(NAME).pem volumes/ssl

start: $(CERT)
	sudo docker compose -f docker-compose.yml up --build

debug: $(CERT)
	sudo BUILDKIT_PROGRESS=plain docker compose -f docker-compose.yml up --build

stop:
	sudo docker compose -f docker-compose.yml down

clean: stop
	sudo docker system prune -f

fclean: stop
	sudo docker system prune -af --volumes

re: fclean start
