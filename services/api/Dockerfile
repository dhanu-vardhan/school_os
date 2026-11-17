FROM gradle:8.10.2-jdk21 AS build
WORKDIR /workspace
COPY services/api/ ./
RUN gradle bootJar --no-daemon -x test && cp "$(find build/libs -name '*.jar' ! -name '*plain*' | head -1)" /workspace/app.jar

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /workspace/app.jar app.jar
EXPOSE 8080
ENV SPRING_PROFILES_ACTIVE=demo \
    SPRING_DATASOURCE_URL=jdbc:postgresql://postgres:5432/schoolos \
    SPRING_FLYWAY_URL=jdbc:postgresql://postgres:5432/schoolos \
    SCHOOLOS_DEMO_JWT_SECRET=schoolos-local-demo-jwt-secret-change-me
HEALTHCHECK --interval=10s --timeout=5s --retries=30 \
  CMD bash -c 'cat < /dev/null > /dev/tcp/127.0.0.1/8080' || exit 1
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
