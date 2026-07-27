FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY ["SaasPos.Backend.csproj", "./"]
RUN dotnet restore "SaasPos.Backend.csproj"
COPY . .
RUN dotnet build "SaasPos.Backend.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "SaasPos.Backend.csproj" -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends libgssapi-krb5-2 && rm -rf /var/lib/apt/lists/*
COPY --from=publish /app/publish .
EXPOSE 8080
ENTRYPOINT ["dotnet", "SaasPos.Backend.dll"]
