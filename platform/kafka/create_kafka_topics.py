#!/usr/bin/env python3
"""
Kafka Topic Bootstrap Script
Creates all required topics for the Kayak distributed system
"""

import os
import yaml
import sys
from kafka import KafkaAdminClient
from kafka.admin import NewTopic
from kafka.errors import TopicAlreadyExistsError

def load_topic_config():
    """Load topic configuration from YAML file"""
    config_path = os.path.join(os.path.dirname(__file__), 'topics.yaml')
    with open(config_path, 'r') as f:
        config = yaml.safe_load(f)
    return config

def create_topics(admin_client, topics_config):
    """Create Kafka topics based on configuration"""
    created_topics = []
    skipped_topics = []
    
    # Collect all topics from config
    all_topics = []
    for category, topics in topics_config.items():
        if category.endswith('_events'):
            all_topics.extend(topics)
    
    for topic_config in all_topics:
        topic_name = topic_config['name']
        partitions = topic_config['partitions']
        replication_factor = topic_config['replication_factor']
        retention_ms = topic_config.get('retention_ms', 604800000)
        
        topic = NewTopic(
            name=topic_name,
            num_partitions=partitions,
            replication_factor=replication_factor,
            topic_configs={
                'retention.ms': retention_ms,
                'compression.type': 'snappy'
            }
        )
        
        try:
            admin_client.create_topics([topic])
            created_topics.append(topic_name)
            print(f"✅ Created topic: {topic_name} ({partitions} partitions)")
        except TopicAlreadyExistsError:
            skipped_topics.append(topic_name)
            print(f"⏭️  Skipped existing topic: {topic_name}")
        except Exception as e:
            print(f"❌ Failed to create topic {topic_name}: {e}")
    
    return created_topics, skipped_topics

def bootstrap_topics():
    """Main bootstrap function"""
    config = load_topic_config()
    
    # Kafka connection settings
    kafka_config = {
        'bootstrap_servers': os.getenv('KAFKA_BROKERS', 'localhost:9092'),
        'client_id': 'kayak-topic-bootstrap'
    }
    
    try:
        admin_client = KafkaAdminClient(**kafka_config)
        
        print("🚀 Bootstrapping Kafka topics for Kayak system...")
        created, skipped = create_topics(admin_client, config)
        
        print(f"\n📊 Summary:")
        print(f"   Created: {len(created)} topics")
        print(f"   Skipped: {len(skipped)} topics (already exist)")
        
        # Display topic list
        topics = admin_client.list_topics()
        kayak_topics = [t for t in topics if '.' in t and not t.startswith('__')]
        print(f"\n📋 Current Kayak topics ({len(kayak_topics)}):")
        for topic in sorted(kayak_topics):
            print(f"   - {topic}")
            
    except Exception as e:
        print(f"❌ Bootstrap failed: {e}")
        sys.exit(1)
    finally:
        if 'admin_client' in locals():
            admin_client.close()

if __name__ == "__main__":
    bootstrap_topics()