"""Kafka integration for concierge service."""

from __future__ import annotations

import asyncio
import contextlib
import json

from aiokafka import AIOKafkaConsumer

from ..schemas import DealEvent


class DealEventConsumer:
    """Consumes deal events from Kafka and updates the cache."""

    def __init__(self, settings, deal_cache):
        self._settings = settings
        self._deal_cache = deal_cache
        self._consumer: AIOKafkaConsumer | None = None
        self._task: asyncio.Task | None = None

    @property
    def enabled(self) -> bool:
        return bool(self._settings.kafka_bootstrap_servers)

    async def start(self) -> None:
        if not self.enabled:
            return
        
        # Retry logic for Kafka connection
        max_retries = 5
        retry_delay = 5
        
        for attempt in range(max_retries):
            try:
                self._consumer = AIOKafkaConsumer(
                    self._settings.kafka_deal_topic,
                    bootstrap_servers=self._settings.kafka_bootstrap_servers,
                    group_id=self._settings.kafka_group_id,
                    enable_auto_commit=True,
                    value_deserializer=lambda v: v.decode("utf-8"),
                )
                await self._consumer.start()
                self._task = asyncio.create_task(self._consume())
                print(f"[deal-consumer] Successfully connected to Kafka on attempt {attempt + 1}")
                return
            except Exception as exc:
                print(f"[deal-consumer] Failed to connect to Kafka (attempt {attempt + 1}/{max_retries}): {exc}")
                if attempt < max_retries - 1:
                    print(f"[deal-consumer] Retrying in {retry_delay} seconds...")
                    await asyncio.sleep(retry_delay)
                    retry_delay *= 2  # Exponential backoff
                else:
                    print("[deal-consumer] Max retries reached. Continuing without Kafka consumer.")
                    self._consumer = None
                    return

    async def _consume(self) -> None:
        assert self._consumer is not None
        try:
            async for message in self._consumer:
                try:
                    payload = json.loads(message.value)
                    event = DealEvent(**payload)
                    await self._deal_cache.upsert_deal_event(event)
                except Exception as exc:  # pragma: no cover
                    print(f"[deal-consumer] failed to process message: {exc}")
        except asyncio.CancelledError:
            pass

    async def stop(self) -> None:
        if self._task:
            self._task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await self._task
        if self._consumer:
            await self._consumer.stop()
