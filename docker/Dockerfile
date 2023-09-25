FROM node:20-alpine3.18

RUN which crond && \
  rm -rf /etc/periodic

COPY entrypoint.sh /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]

COPY crontab ./crontab
RUN crontab ./crontab

CMD ["crond", "-f", "-l", "2"]
