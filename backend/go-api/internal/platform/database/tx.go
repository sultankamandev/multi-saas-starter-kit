package database

import (
	"context"
	"fmt"

	"gorm.io/gorm"
)

type ctxKey struct{}

// TxManager handles database transactions. Services call WithTx to wrap
// multiple repository operations in a single transaction.
type TxManager struct {
	db *gorm.DB
}

func NewTxManager(db *gorm.DB) *TxManager {
	return &TxManager{db: db}
}

func (tm *TxManager) WithTx(ctx context.Context, fn func(ctx context.Context) error) error {
	tx := tm.db.WithContext(ctx).Begin()
	if tx.Error != nil {
		return fmt.Errorf("begin transaction: %w", tx.Error)
	}

	txCtx := context.WithValue(ctx, ctxKey{}, tx)

	if err := fn(txCtx); err != nil {
		if rbErr := tx.Rollback().Error; rbErr != nil {
			return fmt.Errorf("rollback failed: %v (original: %w)", rbErr, err)
		}
		return err
	}

	if err := tx.Commit().Error; err != nil {
		return fmt.Errorf("commit transaction: %w", err)
	}
	return nil
}

// DBFromContext returns the *gorm.DB from context if a transaction is active,
// otherwise falls back to the provided default DB. Every repository method
// should call this to participate in transactions transparently.
func DBFromContext(ctx context.Context, fallback *gorm.DB) *gorm.DB {
	if tx, ok := ctx.Value(ctxKey{}).(*gorm.DB); ok {
		return tx
	}
	return fallback.WithContext(ctx)
}
