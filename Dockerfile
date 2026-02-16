FROM eclipse-temurin:21-jre-jammy

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

COPY target/*.war /app/
RUN set -eux; \
    war_count=$(ls -1 /app/*.war | wc -l); \
    [ "$war_count" -eq 1 ]; \
    mv /app/*.war /app/mobinogi-web.war

EXPOSE 50620

ENTRYPOINT ["java", "-Xms512m", "-Xmx1024m", "-jar", "/app/mobinogi-web.war"]
