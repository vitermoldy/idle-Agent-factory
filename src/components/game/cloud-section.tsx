import { useEffect, useState, type FormEvent } from 'react'
import { useGame } from '@/game/store'
import * as E from '@/game/engine'
import { cloudState, fetchStats, onCloud, recoveryCode, restoreFrom } from '@/game/cloud'

