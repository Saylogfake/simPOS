FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY ["backend/SaasPos.Backend.csproj", "backend/"]
RUN dotnet restore "backend/SaasPos.Backend.csproj"
COPY backend/ backend/
WORKDIR "/src/backend"
RUN dotnet build "SaasPos.Backend.csproj" -c Release -o /app/build

FROM build AS publish
WORKDIR "/src/backend"
RUN dotnet publish "SaasPos.Backend.csproj" -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "SaasPos.Backend.dll"]
