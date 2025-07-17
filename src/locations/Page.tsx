import React, { useState, useEffect } from "react";
import {
  Button,
  Card,
  Heading,
  Stack,
  Text,
  Badge,
  TextInput,
  Flex,
  Note,
  Spinner,
} from "@contentful/f36-components";
import { PageAppSDK } from "@contentful/app-sdk";
import { useCMA, useSDK } from "@contentful/react-apps-toolkit";

interface Migration {
  migrationId: string;
  status: string;
  startedAt?: number;
  completedAt?: number;
  duration?: number;
}

const Page = () => {
  const sdk = useSDK<PageAppSDK>();
  const cma = useCMA();

  const [migrations, setMigrations] = useState<Migration[]>([]);
  const [backendUrl, setBackendUrl] = useState("http://localhost:3000"); // Move this to an installation parameter or config in production
  const [isStarting, setIsStarting] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check if there are any active migrations
  const hasActiveMigrations = migrations.some((m) => m.status === "started");

  // Local storage keys
  const STORAGE_KEY = "contentful-migration-app";

  // Save migrations to local storage
  const saveMigrationsToStorage = (migrationsToSave: Migration[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migrationsToSave));
    } catch (error) {
      console.error("Failed to save migrations to localStorage:", error);
    }
  };

  // Load migrations from local storage
  const loadMigrationsFromStorage = (): Migration[] => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error("Failed to load migrations from localStorage:", error);
      return [];
    }
  };

  // Load stored migrations and check status on component mount
  useEffect(() => {
    const initializeMigrations = async () => {
      const storedMigrations = loadMigrationsFromStorage();
      setMigrations(storedMigrations);

      // Check status of any stored "started" migrations
      const activeMigrations = storedMigrations.filter(
        (m) => m.status === "started"
      );
      if (activeMigrations.length > 0) {
        console.log(
          `Found ${activeMigrations.length} active migration(s), checking status...`
        );
        for (const migration of activeMigrations) {
          await checkMigrationStatus(migration.migrationId);
        }
      }

      setIsLoading(false);
    };

    initializeMigrations();
  }, []);

  // Save migrations to storage whenever they change
  useEffect(() => {
    if (!isLoading) {
      saveMigrationsToStorage(migrations);
    }
  }, [migrations, isLoading]);

  const startMigration = async () => {
    setIsStarting(true);
    try {
      const signedRequest = await cma.appSignedRequest.create(
        { appDefinitionId: sdk.ids.app },
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
          path: "/start-migration",
        }
      );

      const response = await fetch(`${backendUrl}/start-migration`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...signedRequest.additionalHeaders,
        },
        body: JSON.stringify({}),
      });

      if (response.ok) {
        const migration = await response.json();
        setMigrations((prev) => [migration, ...prev]);
        sdk.notifier.success("Migration started!");
      } else {
        throw new Error("Failed to start migration");
      }
    } catch (error) {
      console.error("Error:", error);
      sdk.notifier.error("Failed to start migration");
    } finally {
      setIsStarting(false);
    }
  };

  // Does the polling for migration status
  const checkMigrationStatus = async (migrationId: string) => {
    try {
      const signedRequest = await cma.appSignedRequest.create(
        { appDefinitionId: sdk.ids.app },
        {
          method: "GET",
          headers: {},
          body: "",
          path: `/migration-status/${migrationId}`,
        }
      );

      const response = await fetch(
        `${backendUrl}/migration-status/${migrationId}`,
        {
          method: "GET",
          headers: {
            ...signedRequest.additionalHeaders,
          },
        }
      );

      if (response.ok) {
        const updatedMigration = await response.json();
        setMigrations((prev) => {
          const oldMigration = prev.find((m) => m.migrationId === migrationId);
          const wasStarted = oldMigration?.status === "started";
          const isNowComplete = updatedMigration.status === "completed";
          const isNowFailed = updatedMigration.status === "failed";

          // Show notification when status changes from started to completed/failed
          if (wasStarted && isNowComplete) {
            sdk.notifier.success(
              `Migration ${migrationId} completed successfully!`
            );
          } else if (wasStarted && isNowFailed) {
            sdk.notifier.error(`Migration ${migrationId} failed.`);
          }

          return prev.map((m) =>
            m.migrationId === migrationId ? { ...m, ...updatedMigration } : m
          );
        });
      }
    } catch (error) {
      console.error("Error checking migration status:", error);
    }
  };

  // Auto-poll active migrations
  useEffect(() => {
    const activeMigrations = migrations.filter((m) => m.status === "started");

    if (activeMigrations.length === 0) {
      setIsPolling(false);
      return;
    }

    setIsPolling(true);
    const interval = setInterval(() => {
      activeMigrations.forEach((migration) => {
        checkMigrationStatus(migration.migrationId);
      });
    }, 3000); // Poll every 3 seconds

    return () => {
      clearInterval(interval);
      setIsPolling(false);
    };
  }, [migrations, backendUrl]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "started":
        return "primary";
      case "completed":
        return "positive";
      case "failed":
        return "negative";
      default:
        return "secondary";
    }
  };

  const getStatusIcon = (status: string) => {
    if (status === "started") {
      return <Spinner size="small" />;
    }
    return null;
  };

  return (
    <div style={{ padding: "0 2rem" }}>
      <div style={{ textAlign: "center", marginBottom: "2rem" }}>
        <Heading>Migration Management</Heading>
        {isPolling && (
          <Text fontSize="fontSizeS" fontColor="gray600">
            <Flex
              justifyContent="center"
              alignItems="center"
              style={{ gap: "0.5rem" }}
            >
              <Spinner size="small" />
              Checking migration status...
            </Flex>
          </Text>
        )}
      </div>

      {isLoading ? (
        <Stack spacing="spacingL">
          <div style={{ textAlign: "center" }}>
            <Text fontSize="fontSizeS" fontColor="gray600">
              <Flex
                justifyContent="center"
                alignItems="center"
                style={{ gap: "0.5rem" }}
              >
                <Spinner size="small" />
                Loading migration status...
              </Flex>
            </Text>
          </div>
        </Stack>
      ) : (
        <div style={{ display: "flex", gap: "2rem", alignItems: "flex-start" }}>
          <Card style={{ flex: "0 0 400px" }}>
            <Stack spacing="spacingM">
              <Heading as="h2">Start Migration</Heading>

              <Button
                variant="primary"
                onClick={startMigration}
                isDisabled={isStarting || hasActiveMigrations}
              >
                {isStarting
                  ? "Starting..."
                  : hasActiveMigrations
                  ? "Migration in Progress..."
                  : "Start Migration"}
              </Button>
            </Stack>
          </Card>

          <Card style={{ flex: "1" }}>
            <div>
              <Heading as="h2" style={{ marginBottom: "1rem" }}>
                Migration History
              </Heading>
              {migrations.length === 0 ? (
                <Note>No migrations started yet.</Note>
              ) : (
                <div>
                  {migrations.map((migration, index) => (
                    <div
                      key={migration.migrationId}
                      style={{
                        marginBottom:
                          index < migrations.length - 1 ? "1.5rem" : "0",
                        borderBottom:
                          index < migrations.length - 1
                            ? "1px solid #e5e5e5"
                            : "none",
                        paddingBottom:
                          index < migrations.length - 1 ? "1rem" : "0",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "0.5rem",
                        }}
                      >
                        <Text fontWeight="fontWeightMedium">
                          Migration ID: {migration.migrationId}
                        </Text>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                          }}
                        >
                          {getStatusIcon(migration.status)}
                          <Badge variant={getStatusColor(migration.status)}>
                            {migration.status.toUpperCase()}
                          </Badge>
                        </div>
                      </div>
                      <div>
                        {migration.startedAt && (
                          <Text
                            fontSize="fontSizeS"
                            fontColor="gray600"
                            style={{
                              display: "block",
                              marginBottom: "0.25rem",
                            }}
                          >
                            Started:{" "}
                            {new Date(migration.startedAt).toLocaleString()}
                          </Text>
                        )}
                        {migration.completedAt && (
                          <Text
                            fontSize="fontSizeS"
                            fontColor="gray600"
                            style={{
                              display: "block",
                              marginBottom: "0.25rem",
                            }}
                          >
                            Completed:{" "}
                            {new Date(migration.completedAt).toLocaleString()}
                          </Text>
                        )}
                        {migration.duration && (
                          <Text
                            fontSize="fontSizeS"
                            fontColor="gray600"
                            style={{ display: "block" }}
                          >
                            Duration: {(migration.duration / 1000).toFixed(1)}s
                          </Text>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Page;
